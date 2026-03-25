// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title GovernanceDAO — MeeChain On-Chain DAO Governance Contract
/// @notice Token-weighted voting system for MeeChain platform decisions
/// @dev Voting power = MEE token balance at snapshot block
contract GovernanceDAO is Ownable, ReentrancyGuard {

    // ─────────────────────────────────────────────────────────────────
    //  CONSTANTS & CONFIGURATION
    // ─────────────────────────────────────────────────────────────────
    uint256 public constant QUORUM           = 100_000 * 1e18;  // 100,000 MEE quorum
    uint256 public constant PROPOSAL_STAKE   = 1_000   * 1e18;  // 1,000 MEE to create proposal
    uint256 public constant VOTING_PERIOD    = 7 days;
    uint256 public constant EXECUTION_DELAY  = 2 days;          // timelock after passing
    uint256 public constant MAX_DESCRIPTION  = 2000;            // chars limit

    // ─────────────────────────────────────────────────────────────────
    //  TYPES
    // ─────────────────────────────────────────────────────────────────
    enum ProposalState { Pending, Active, Passed, Rejected, Executed, Cancelled }
    enum VoteType      { Against, For, Abstain }

    struct Proposal {
        uint256     id;
        address     proposer;
        string      title;
        string      description;
        string      category;          // staking | nft | development | community | general
        uint256     votesFor;
        uint256     votesAgainst;
        uint256     votesAbstain;
        uint256     startTime;
        uint256     endTime;
        uint256     executionTime;     // after passing + delay
        uint256     snapshotBlock;     // block for voting power snapshot
        bool        executed;
        bool        cancelled;
        bytes       callData;          // optional on-chain execution payload
        address     target;            // optional target contract
    }

    struct Receipt {
        bool     hasVoted;
        VoteType vote;
        uint256  power;     // MEE amount used
    }

    // ─────────────────────────────────────────────────────────────────
    //  STATE
    // ─────────────────────────────────────────────────────────────────
    address public meeToken;                               // MEE ERC-20 address
    uint256 public proposalCount;

    mapping(uint256 => Proposal)                        public proposals;
    mapping(uint256 => mapping(address => Receipt))     public receipts;
    mapping(address => uint256[])                       private _userProposals;
    mapping(address => uint256[])                       private _userVotes;

    // ─────────────────────────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────────────────────────
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string  title,
        string  category,
        uint256 startTime,
        uint256 endTime
    );
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        VoteType        vote,
        uint256         power,
        string          reason
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId, string reason);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);

    // ─────────────────────────────────────────────────────────────────
    //  CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────
    constructor(address _meeToken) Ownable(msg.sender) {
        require(_meeToken != address(0), "DAO: invalid MEE token address");
        meeToken = _meeToken;
    }

    // ─────────────────────────────────────────────────────────────────
    //  MODIFIERS
    // ─────────────────────────────────────────────────────────────────
    modifier validProposal(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCount, "DAO: invalid proposal ID");
        _;
    }

    // ─────────────────────────────────────────────────────────────────
    //  PROPOSAL CREATION
    // ─────────────────────────────────────────────────────────────────

    /// @notice Create a new governance proposal
    /// @param title      Short title (max 100 chars)
    /// @param description Full description (max 2000 chars)
    /// @param category   Category label (staking|nft|development|community|general)
    /// @param target     Optional contract to call on execution (address(0) = none)
    /// @param callData   Optional calldata for target (empty = no on-chain action)
    function propose(
        string  calldata title,
        string  calldata description,
        string  calldata category,
        address          target,
        bytes   calldata callData
    ) external nonReentrant returns (uint256 proposalId) {
        require(bytes(title).length > 0 && bytes(title).length <= 100,       "DAO: invalid title length");
        require(bytes(description).length > 0 && bytes(description).length <= MAX_DESCRIPTION, "DAO: description too long");

        // Require minimum MEE balance to prevent spam
        uint256 balance = _meeBalance(msg.sender);
        require(balance >= PROPOSAL_STAKE, "DAO: insufficient MEE (need 1000 MEE)");

        proposalCount++;
        proposalId = proposalCount;

        uint256 start = block.timestamp;
        uint256 end   = start + VOTING_PERIOD;

        proposals[proposalId] = Proposal({
            id:            proposalId,
            proposer:      msg.sender,
            title:         title,
            description:   description,
            category:      category,
            votesFor:      0,
            votesAgainst:  0,
            votesAbstain:  0,
            startTime:     start,
            endTime:       end,
            executionTime: end + EXECUTION_DELAY,
            snapshotBlock: block.number,
            executed:      false,
            cancelled:     false,
            callData:      callData,
            target:        target
        });

        _userProposals[msg.sender].push(proposalId);

        emit ProposalCreated(proposalId, msg.sender, title, category, start, end);
    }

    // ─────────────────────────────────────────────────────────────────
    //  VOTING
    // ─────────────────────────────────────────────────────────────────

    /// @notice Cast a vote on an active proposal
    /// @param proposalId Target proposal
    /// @param voteType   0=Against 1=For 2=Abstain
    /// @param reason     Optional reason string (logged in event)
    function castVote(
        uint256 proposalId,
        VoteType voteType,
        string calldata reason
    ) external nonReentrant validProposal(proposalId) {
        Proposal storage p = proposals[proposalId];

        require(getProposalState(proposalId) == ProposalState.Active, "DAO: proposal not active");
        require(!receipts[proposalId][msg.sender].hasVoted,           "DAO: already voted");

        uint256 power = _meeBalance(msg.sender);
        require(power > 0, "DAO: no voting power (need MEE)");

        // Record receipt
        receipts[proposalId][msg.sender] = Receipt({
            hasVoted: true,
            vote:     voteType,
            power:    power
        });

        // Tally votes
        if      (voteType == VoteType.For)     p.votesFor     += power;
        else if (voteType == VoteType.Against)  p.votesAgainst += power;
        else                                    p.votesAbstain += power;

        _userVotes[msg.sender].push(proposalId);

        emit VoteCast(proposalId, msg.sender, voteType, power, reason);
    }

    /// @notice Convenience: vote For
    function voteFor(uint256 proposalId, string calldata reason) external {
        this.castVote(proposalId, VoteType.For, reason);
    }

    /// @notice Convenience: vote Against
    function voteAgainst(uint256 proposalId, string calldata reason) external {
        this.castVote(proposalId, VoteType.Against, reason);
    }

    // ─────────────────────────────────────────────────────────────────
    //  EXECUTION
    // ─────────────────────────────────────────────────────────────────

    /// @notice Execute a passed proposal after timelock
    function execute(uint256 proposalId) external nonReentrant validProposal(proposalId) {
        Proposal storage p = proposals[proposalId];

        require(getProposalState(proposalId) == ProposalState.Passed, "DAO: proposal not passed");
        require(block.timestamp >= p.executionTime,                   "DAO: timelock not expired");
        require(!p.executed,                                           "DAO: already executed");

        p.executed = true;

        // Execute on-chain call if target is set
        if (p.target != address(0) && p.callData.length > 0) {
            (bool success, ) = p.target.call(p.callData);
            require(success, "DAO: execution call failed");
        }

        emit ProposalExecuted(proposalId);
    }

    /// @notice Cancel a proposal (proposer or owner only, while still pending/active)
    function cancel(uint256 proposalId, string calldata reason) external validProposal(proposalId) {
        Proposal storage p = proposals[proposalId];
        ProposalState state = getProposalState(proposalId);

        require(
            msg.sender == p.proposer || msg.sender == owner(),
            "DAO: not proposer or owner"
        );
        require(
            state == ProposalState.Pending || state == ProposalState.Active,
            "DAO: cannot cancel in current state"
        );

        p.cancelled = true;
        emit ProposalCancelled(proposalId, reason);
    }

    // ─────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────

    /// @notice Get the current state of a proposal
    function getProposalState(uint256 proposalId)
        public view validProposal(proposalId) returns (ProposalState)
    {
        Proposal storage p = proposals[proposalId];

        if (p.cancelled)                          return ProposalState.Cancelled;
        if (p.executed)                           return ProposalState.Executed;
        if (block.timestamp < p.startTime)        return ProposalState.Pending;
        if (block.timestamp <= p.endTime)         return ProposalState.Active;

        // After voting period: check quorum + majority
        uint256 total = p.votesFor + p.votesAgainst + p.votesAbstain;
        if (total < QUORUM)                       return ProposalState.Rejected;
        if (p.votesFor > p.votesAgainst)          return ProposalState.Passed;
        return ProposalState.Rejected;
    }

    /// @notice Get vote receipt for a specific voter
    function getReceipt(uint256 proposalId, address voter)
        external view returns (Receipt memory)
    {
        return receipts[proposalId][voter];
    }

    /// @notice Get vote percentages (scaled ×100 for 2 decimals)
    function getVotePercentages(uint256 proposalId)
        external view validProposal(proposalId)
        returns (uint256 forPct, uint256 againstPct, uint256 abstainPct, uint256 total)
    {
        Proposal storage p = proposals[proposalId];
        total = p.votesFor + p.votesAgainst + p.votesAbstain;
        if (total == 0) return (0, 0, 0, 0);
        forPct     = (p.votesFor     * 10000) / total;
        againstPct = (p.votesAgainst * 10000) / total;
        abstainPct = (p.votesAbstain * 10000) / total;
    }

    /// @notice Get all proposals by a user
    function getUserProposals(address user) external view returns (uint256[] memory) {
        return _userProposals[user];
    }

    /// @notice Get all proposals a user voted on
    function getUserVotes(address user) external view returns (uint256[] memory) {
        return _userVotes[user];
    }

    /// @notice Get a page of proposals (newest first)
    function getProposals(uint256 offset, uint256 limit)
        external view returns (Proposal[] memory page, uint256 totalCount)
    {
        totalCount = proposalCount;
        if (offset >= totalCount) return (new Proposal[](0), totalCount);

        uint256 end   = offset + limit > totalCount ? totalCount : offset + limit;
        uint256 count = end - offset;
        page = new Proposal[](count);

        for (uint256 i = 0; i < count; i++) {
            // Return newest first: totalCount - offset - i
            page[i] = proposals[totalCount - offset - i];
        }
    }

    /// @notice Check if quorum is reached for a proposal
    function quorumReached(uint256 proposalId)
        external view validProposal(proposalId) returns (bool)
    {
        Proposal storage p = proposals[proposalId];
        return (p.votesFor + p.votesAgainst + p.votesAbstain) >= QUORUM;
    }

    /// @notice Summary stats
    function getStats() external view returns (
        uint256 total, uint256 active, uint256 passed, uint256 rejected
    ) {
        total = proposalCount;
        for (uint256 i = 1; i <= proposalCount; i++) {
            ProposalState s = getProposalState(i);
            if (s == ProposalState.Active)   active++;
            else if (s == ProposalState.Passed)   passed++;
            else if (s == ProposalState.Rejected) rejected++;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  ADMIN
    // ─────────────────────────────────────────────────────────────────

    /// @notice Update MEE token address (owner only)
    function setMeeToken(address newToken) external onlyOwner {
        require(newToken != address(0), "DAO: zero address");
        meeToken = newToken;
    }

    // ─────────────────────────────────────────────────────────────────
    //  INTERNAL
    // ─────────────────────────────────────────────────────────────────

    /// @dev Returns MEE balance of account (used as voting power)
    function _meeBalance(address account) internal view returns (uint256) {
        if (meeToken == address(0)) return 0;
        // Low-level call to avoid import cycle; equivalent to IERC20(meeToken).balanceOf(account)
        (bool ok, bytes memory data) = meeToken.staticcall(
            abi.encodeWithSignature("balanceOf(address)", account)
        );
        if (!ok || data.length < 32) return 0;
        return abi.decode(data, (uint256));
    }
}

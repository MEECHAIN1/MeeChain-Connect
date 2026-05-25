// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title NeonovaPortal — Cross-chain Bridge & Ritual Ceremony Contract
/// @notice Handles MEE token transfers, staking deposits, and ritual ceremonies on MeeChain
contract NeonovaPortal is Ownable, ReentrancyGuard {
    // ── State ──────────────────────────────────────────────────────
    address public meeTokenAddress;
    uint256 public totalPortalValue;    // Total MEE locked in portal
    uint256 public ceremonyCount;       // Number of ritual ceremonies performed
    uint256 public constant PORTAL_FEE = 1e15; // 0.001 MEE portal fee

    enum CeremonyType { Stake, Unstake, Bridge, Ritual, Offering }

    struct Ceremony {
        uint256     id;
        address     participant;
        CeremonyType ctype;
        uint256     amount;
        uint256     timestamp;
        bytes32     ritualHash;         // keccak256 signature of the ceremony
        bool        completed;
    }

    struct UserPortal {
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        uint256 ceremoniesPerformed;
        uint256 lastActivity;
        bool    isRegistered;
    }

    mapping(address => UserPortal)        public userPortals;
    mapping(uint256 => Ceremony)          public ceremonies;
    mapping(address => uint256[])         public userCeremonies;

    // ── Events ─────────────────────────────────────────────────────
    event PortalEntered(address indexed user, uint256 amount, CeremonyType ctype, uint256 ceremonyId);
    event PortalExited(address indexed user, uint256 amount, uint256 ceremonyId);
    event CeremonyCompleted(uint256 indexed ceremonyId, address indexed participant, bytes32 ritualHash);
    event RitualOffering(address indexed participant, uint256 amount, string message);
    event TokenAddressSet(address indexed token);

    constructor() Ownable(msg.sender) {}

    // ── Admin ───────────────────────────────────────────────────────
    function setMeeToken(address token) external onlyOwner {
        require(token != address(0), "NeonovaPortal: zero address");
        meeTokenAddress = token;
        emit TokenAddressSet(token);
    }

    // ── Portal Entry (deposit) ─────────────────────────────────────
    /// @notice Enter the portal with native MEE (payable)
    function enterPortal(CeremonyType ctype, string calldata message)
        external payable nonReentrant returns (uint256 ceremonyId)
    {
        require(msg.value > PORTAL_FEE, "NeonovaPortal: amount too small");

        uint256 netAmount = msg.value - PORTAL_FEE;
        totalPortalValue += netAmount;

        // Register user if new
        if (!userPortals[msg.sender].isRegistered) {
            userPortals[msg.sender].isRegistered = true;
        }
        userPortals[msg.sender].totalDeposited   += netAmount;
        userPortals[msg.sender].ceremoniesPerformed++;
        userPortals[msg.sender].lastActivity      = block.timestamp;

        // Create ceremony
        ceremonyId = ceremonyCount++;
        bytes32 ritualHash = keccak256(abi.encodePacked(msg.sender, ceremonyId, block.timestamp, netAmount));

        ceremonies[ceremonyId] = Ceremony({
            id:          ceremonyId,
            participant: msg.sender,
            ctype:       ctype,
            amount:      netAmount,
            timestamp:   block.timestamp,
            ritualHash:  ritualHash,
            completed:   false
        });
        userCeremonies[msg.sender].push(ceremonyId);

        emit PortalEntered(msg.sender, netAmount, ctype, ceremonyId);
        if (bytes(message).length > 0) {
            emit RitualOffering(msg.sender, netAmount, message);
        }
    }

    /// @notice Complete a ceremony (owner validation)
    function completeCeremony(uint256 ceremonyId) external onlyOwner {
        Ceremony storage c = ceremonies[ceremonyId];
        require(!c.completed, "NeonovaPortal: already completed");
        c.completed = true;
        ceremonyCount;
        emit CeremonyCompleted(ceremonyId, c.participant, c.ritualHash);
    }

    /// @notice Exit portal — withdraw deposited MEE back to user
    function exitPortal(uint256 ceremonyId) external nonReentrant {
        Ceremony storage c = ceremonies[ceremonyId];
        require(c.participant == msg.sender, "NeonovaPortal: not your ceremony");
        require(c.completed,                 "NeonovaPortal: ceremony not complete");

        uint256 amount = c.amount;
        require(address(this).balance >= amount, "NeonovaPortal: insufficient balance");

        totalPortalValue                      -= amount;
        userPortals[msg.sender].totalWithdrawn += amount;
        c.amount = 0;

        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "NeonovaPortal: transfer failed");

        emit PortalExited(msg.sender, amount, ceremonyId);
    }

    // ── Views ───────────────────────────────────────────────────────
    function getUserPortal(address user) external view returns (UserPortal memory) {
        return userPortals[user];
    }

    function getUserCeremonies(address user) external view returns (uint256[] memory) {
        return userCeremonies[user];
    }

    function getCeremony(uint256 ceremonyId) external view returns (Ceremony memory) {
        return ceremonies[ceremonyId];
    }

    function getPortalStats() external view returns (
        uint256 totalLocked,
        uint256 totalCeremonies,
        uint256 contractBalance,
        address tokenAddr
    ) {
        return (
            totalPortalValue,
            ceremonyCount,
            address(this).balance,
            meeTokenAddress
        );
    }

    // ── Emergency ──────────────────────────────────────────────────
    function withdrawFees() external onlyOwner {
        uint256 fees = address(this).balance > totalPortalValue
            ? address(this).balance - totalPortalValue
            : 0;
        if (fees > 0) {
            (bool ok,) = payable(owner()).call{value: fees}("");
            require(ok, "NeonovaPortal: fee withdrawal failed");
        }
    }

    receive() external payable {}
}

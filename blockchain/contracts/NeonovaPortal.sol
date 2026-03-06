// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title NeonovaPortal
 * @dev ระบบสุ่ม NFT โดยใช้เหรียญ MCB และมีระบบสะสมค่าโชค (Luck System)
 */
contract NeonovaPortal is ERC721URIStorage, Ownable {
    using Strings for uint256;

    // อ้างอิงถึงเหรียญ MCB (MeeBotMining)
    IERC20 public mcbToken;

    uint256 public tokenCounter;
    uint256 public constant SUMMON_PRICE = 50 * 10**18; // ราคา 50 MCB ต่อการสุ่ม 1 ครั้ง
    uint256 public constant MAX_LUCK = 100;

    // Metadata URIs (ตัวอย่าง URL สำหรับเก็บข้อมูลรูปภาพ NFT)
    string private constant URI_COMMON = "ipfs://Qm.../common.json";
    string private constant URI_RARE = "ipfs://Qm.../rare.json";

    mapping(address => uint256) public userLuck;

    event SummonResult(address indexed user, uint256 tokenId, string grade, uint256 currentLuck);

    constructor(address _mcbTokenAddress) ERC721("Neonova Pilot", "NVP") Ownable(msg.sender) {
        mcbToken = IERC20(_mcbTokenAddress);
        tokenCounter = 0;
    }

    /**
     * @dev ฟังก์ชันสำหรับสุ่ม NFT
     * @param amount จำนวนที่ต้องการสุ่ม
     */
    function summon(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        uint256 totalCost = SUMMON_PRICE * amount;

        // จ่ายเหรียญ MCB (ต้อง Approve ก่อนเรียกฟังก์ชันนี้)
        require(mcbToken.transferFrom(msg.sender, address(this), totalCost), "Transfer of MCB failed");

        for (uint256 i = 0; i < amount; i++) {
            _executeSummon(msg.sender);
        }
    }

    /**
     * @dev ฟังก์ชันภายในที่ทำการ Mint NFT จริง
     */
    function _executeSummon(address user) internal {
        uint256 newItemId = tokenCounter;
        string memory grade;
        string memory finalTokenURI;

        // เช็คระบบ Pity (ดวง)
        if (userLuck[user] >= MAX_LUCK) {
            // บังคับได้ Rare (Grade R)
            grade = "R";
            finalTokenURI = URI_RARE;
            userLuck[user] = 0; // Reset luck
        } else {
            // สุ่มจริง (โอกาส 5% ได้ R)
            uint256 rand = uint256(keccak256(abi.encodePacked(block.timestamp, user, newItemId))) % 100;

            if (rand < 5) {
                grade = "R";
                finalTokenURI = URI_RARE;
                userLuck[user] = 0; // Reset luck เมื่อได้ของดี
            } else {
                grade = "Common";
                finalTokenURI = URI_COMMON;
                userLuck[user] += 1; // เพิ่มแต้มดวงถ้าไม่ได้ของดี
            }
        }

        // 🛠️ การ Mint NFT จริงๆ เข้าสู่ระบบ Blockchain
        _safeMint(user, newItemId);
        _setTokenURI(newItemId, finalTokenURI);

        tokenCounter++;

        emit SummonResult(user, newItemId, grade, userLuck[user]);
    }

    // เจ้าของสามารถถอนเหรียญ MCB ที่สะสมไว้ในคอนแทรคได้
    function withdrawTokens() external onlyOwner {
        uint256 balance = mcbToken.balanceOf(address(this));
        mcbToken.transfer(msg.sender, balance);
    }
}
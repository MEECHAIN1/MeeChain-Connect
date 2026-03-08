// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MeeChainToken
 * @dev สมาร์ทคอนแทรคสำหรับเหรียญ MeeChainToken (MEE) 
 * ใช้มาตรฐาน ERC-20 จาก OpenZeppelin เพื่อความปลอดภัย
 */
contract MeeChainToken is ERC20, Ownable {

    // กำหนดจำนวนเหรียญเริ่มต้น (1,000,000 MEE)
    uint256 private constant INITIAL_SUPPLY = 1_000_000 * 10**18;

    constructor() ERC20("MeeChainToken", "MCB") Ownable(msg.sender) {
        // ทำการ Mint เหรียญทั้งหมดให้ผู้สร้างคอนแทรคตอนเริ่มต้น
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /**
     * @dev ฟังก์ชันสำหรับสร้างเหรียญเพิ่ม (เฉพาะเจ้าของเท่านั้นที่ทำได้)
     * @param to ที่อยู่กระเป๋าที่จะรับเหรียญ
     * @param amount จำนวนเหรียญ (หน่วย wei)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
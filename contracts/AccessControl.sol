pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/ownership/Ownable.sol";

/**
 * @title AccessControl
 * @author team-cspin
 * @dev This contract provides modifiers based on the roles of the sender. Specifically it defines privileged addresses
 * "treasurer" and "operator" which can be set by the owner of the contract.
 */
contract AccessControl is Ownable {

    address public treasurer;
    address public operator;

    modifier onlyTreasurer() {
        require(msg.sender == treasurer);
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator);
        _;
    }

    event SetTreasurer(address _newTreasurer);
    event SetOperator(address _newOperator);

    /**
     * @dev sets the treasurer address to the provided one
     * @param _newTreasurer the address of the new treasurer
     */
    function setTreasurer(address _newTreasurer) public onlyOwner {
        require(_newTreasurer != 0x0);
        treasurer = _newTreasurer;
        SetTreasurer(_newTreasurer);
    }

    /**
     * @dev sets the operator address to the provided one
     * @param _newOperator the address of the new operator
     */
    function setOperator(address _newOperator) public onlyOwner {
        require(_newOperator != 0x0);
        operator = _newOperator;
        SetOperator(_newOperator);
    }
}

pragma solidity ^0.4.18;

import './AccessControl.sol';
import 'zeppelin-solidity/contracts/Payment/PullPayment.sol';
import "zeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title Accounts
 * @author team-cspin
 * @dev Facilitates a withdrawal that maintains the funds allocated by PullPayment
 */
contract Accounts is PullPayment, AccessControl {

    using SafeMath for uint256;

    /**
     * @dev transfers the specified amount of the contract's balance to the specified address. Ensures that it does not
     * transfer funds allocated for users.
     * @param _to recipient address
     * @param _amount wei to transfer from contract to recipient
     */
    function transferPartialBalance(address _to, uint256 _amount) public onlyTreasurer {
        // Ensure there is enough balance in the contract, and that this txn doesn't accidentally take anyone else's
        //   allocated funds.
        require(_amount <= this.balance.sub(totalPayments));
        _to.transfer(_amount);
    }

    /**
     * @dev refunds any positive difference between `_price` and `msg.value` to `msg.sender`
     * @param _price amount that goes to the contract
     */
    function _refundExtraToSender(uint256 _price) internal {
        if (msg.value > _price) {
            uint256 extra = msg.value - _price;
            asyncSend(msg.sender, extra);
        }
    }

}

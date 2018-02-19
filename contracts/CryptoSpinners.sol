pragma solidity ^0.4.18;

import './CryptoSpinnersBase.sol';
import 'zeppelin-solidity/contracts/Payment/PullPayment.sol';
import "zeppelin-solidity/contracts/math/SafeMath.sol";

/**
 * @title CryptoSpinnersMarket
 * @author team-cspin
 * @dev This contract defines the native market functionality for CryptoSpinners including bids and asks. The contract
 * developers (technically the treasurer) takes a 2.5% cut, and the omega spinner holders take a 0.5% cut. Inspired by
 * CyptoPunks Market (https://github.com/larvalabs/cryptopunks)
 */

contract CryptoSpinners is CryptoSpinnersBase {

    using SafeMath for uint256;

    uint256 constant OWNER_CUT_POINTS = 250; // 2.5%
    uint256 constant OMEGA_CUT_POINTS = 50; // 0.5%
    uint256 constant HUNDRED_PERCENT = 10000;
    uint256 public commonSpinnerDecayingAveragePrice = 1 finney; // used for dynamic pricing in seasons and 3rd parties

    struct Ask {
        address seller;
        address onlySellTo;
        uint spinnerIndex;
        uint minValue;
        bool isForSale;
    }

    struct Bid {
        address bidder;
        uint spinnerIndex;
        uint value;
        bool hasBid;
    }

    // A record of spinners that are offered for sale at a specific minimum value, and perhaps to a specific person
    mapping (uint => Ask) public spinnerAsks;
    // A record of the highest spinner bid
    mapping (uint => Bid) public spinnerBids;

    event SpinnerOffered(uint indexed spinnerIndex, uint minValue, address indexed toAddress);
    event SpinnerBidEntered(uint indexed spinnerIndex, uint value, address indexed fromAddress);
    event SpinnerBidWithdrawn(uint indexed spinnerIndex, uint value, address indexed fromAddress);
    event SpinnerBought(uint indexed spinnerIndex, uint value, address indexed fromAddress, address indexed toAddress);
    event SpinnerNoLongerForSale(uint indexed spinnerIndex);

    modifier onlySeller(uint256 _spinnerId) {
        require(spinnerAsks[_spinnerId].seller == msg.sender);
        _;
    }

    modifier onlyBidder(uint256 _spinnerId) {
        require(spinnerBids[_spinnerId].bidder == msg.sender);
        _;
    }

    modifier onlyForSale(uint256 _spinnerId) {
        require(spinnerAsks[_spinnerId].isForSale);
        _;
    }

    modifier onlyForSaleTo(uint256 _spinnerId) {
        require((spinnerAsks[_spinnerId].isForSale && (spinnerAsks[_spinnerId].onlySellTo == 0x0 || spinnerAsks[_spinnerId].onlySellTo == msg.sender)));
        _;
    }

    modifier nonZeroValue {
        require(msg.value > 0);
        _;
    }

    modifier costsPrice(uint256 _spinnerId) {
        require(msg.value >= spinnerAsks[_spinnerId].minValue);
        _;
    }

    /**
     * @dev Creates an offer for the given spinner at `_minSalePriceInWei`
     * @param _spinnerId id of the spinner to offer for sale
     * @param _minSalePriceInWei price to sell the spinner at
     */
    function offerSpinnerForSale(uint _spinnerId, uint _minSalePriceInWei) public validDeed(_spinnerId) onlyOwnerOf(_spinnerId) {
        spinnerAsks[_spinnerId] = Ask(msg.sender, 0x0, _spinnerId, _minSalePriceInWei, true);
        SpinnerOffered(_spinnerId, _minSalePriceInWei, 0x0);
    }

    /**
     * @dev Creates an offer for the given spinner at `_minSalePriceInWei`. Can only be accepted by `_toAddress`
     * @param _spinnerId id of the spinner to offer for sale
     * @param _minSalePriceInWei price to sell the spinner at
     * @param _toAddress address of the recipient
     */
    function offerSpinnerForSaleToAddress(uint _spinnerId, uint _minSalePriceInWei, address _toAddress) public validDeed(_spinnerId) onlyOwnerOf(_spinnerId) {
        require(_toAddress != 0x0);
        spinnerAsks[_spinnerId] = Ask(msg.sender, _toAddress, _spinnerId, _minSalePriceInWei, true);
        SpinnerOffered(_spinnerId, _minSalePriceInWei, _toAddress);
    }

    /**
     * @dev Withdraws the offer for the given spinner.
     * @param _spinnerId id of the spinner to be taken off the market
     */
    function spinnerNoLongerForSale(uint _spinnerId) public validDeed(_spinnerId) onlyOwnerOf(_spinnerId) onlySeller(_spinnerId) {
        spinnerAsks[_spinnerId] = Ask(msg.sender, 0x0, _spinnerId, 0, false);
        SpinnerNoLongerForSale(_spinnerId);
    }

    /**
     * @dev Accepts the current offer for the spinner and transfers payment to the seller's pending balance. Transfers
     * the ownership of the spinner to the buyer.
     * @param _spinnerId id of the spinner to purchase by accepting current offer
     */
    function buySpinner(uint _spinnerId) external payable validDeed(_spinnerId) onlyForSaleTo(_spinnerId) costsPrice(_spinnerId) {
        Ask memory ask = spinnerAsks[_spinnerId];
        address seller = ask.seller;
        uint ownerCut = _computeOwnerCut(msg.value);
        uint omegaCut = _computeGoldCut(msg.value);
        uint award = msg.value.sub(ownerCut).sub(omegaCut);
        asyncSend(seller, award);
        _payGoldHolders(omegaCut);
        // Check for the case where there is a bid from the new owner and refund it.
        // Any other bid can stay in place.
        Bid memory bid = spinnerBids[_spinnerId];
        if (bid.bidder == msg.sender) {
            // Kill bid and refund value
            /* asyncSend(msg.sender, bid.value);
            spinnerBids[_spinnerId] = Bid(0x0, _spinnerId, 0, false); */
            withdrawBidForSpinner(_spinnerId);
        }
        spinnerAsks[_spinnerId] = Ask(0x0, 0x0, _spinnerId, 0, false);
        clearApprovalAndTransfer(seller, msg.sender, _spinnerId);
        if (spinners[_spinnerId].tier == Tier.Common) {
            commonSpinnerDecayingAveragePrice = commonSpinnerDecayingAveragePrice.mul(95);
            commonSpinnerDecayingAveragePrice = commonSpinnerDecayingAveragePrice.add(msg.value.mul(5));
            commonSpinnerDecayingAveragePrice = commonSpinnerDecayingAveragePrice.div(100);
        }
        assert(!spinnerAsks[_spinnerId].isForSale);
        SpinnerBought(_spinnerId, msg.value, seller, msg.sender);
    }

    /**
     * @dev Create a new bid for the given spinner. Your bid value is held by the contract until you withdraw the bid
     * or the owner accepts it.
     * @param _spinnerId id of the spinner to bid on
     */
    function enterBidForSpinner(uint _spinnerId) public validDeed(_spinnerId) nonZeroValue payable {
        address currentOwner = ownerOf(_spinnerId);
        // not unassigned or burned
        require(currentOwner != 0x0 && currentOwner != address(this));
        // not already owned
        require(currentOwner != msg.sender);
        Bid memory existing = spinnerBids[_spinnerId];
        require(msg.value >= existing.value);
        if (existing.value > 0) {
            // Refund the failing bid
            asyncSend(existing.bidder, existing.value);
        }
        spinnerBids[_spinnerId] = Bid(msg.sender, _spinnerId, msg.value, true);
    }

    /**
     * @dev Accepts the bid for the spinner and transfers the bid value to the owner. Transfers ownership of the
     * spinner to the bidder. Uses `_minPrice` to confirm the price the owner is willing to sell for, in case
     * the bid value has changed since the transaction was broadcasted to be mined
     * @param _spinnerId id of the spinner to sell for bid price
     * @param _minPrice minimum value owner is willing to accept, used to confirm bid value
     */
    function acceptBidForSpinner(uint _spinnerId, uint _minPrice) public validDeed(_spinnerId) onlyOwnerOf(_spinnerId) {
        address seller = msg.sender;
        Bid memory bid = spinnerBids[_spinnerId];
        uint amount = bid.value;
        address bidder = bid.bidder;
        // Double check bid value in case it's changed since seller last looked or was never bid on in first place
        require(bid.value != 0);
        require(bid.value >= _minPrice);
        spinnerAsks[_spinnerId] = Ask(0x0, 0x0, _spinnerId, 0, false);
        spinnerBids[_spinnerId] = Bid(0x0, _spinnerId, 0, false);
        uint ownerCut = _computeOwnerCut(amount);
        uint omegaCut = _computeGoldCut(amount);
        uint award = amount.sub(ownerCut).sub(omegaCut);
        clearApprovalAndTransfer(msg.sender, bid.bidder, _spinnerId);
        asyncSend(seller, award);
        _payGoldHolders(omegaCut);
        if (spinners[_spinnerId].tier == Tier.Common) {
            commonSpinnerDecayingAveragePrice = commonSpinnerDecayingAveragePrice.mul(95);
            commonSpinnerDecayingAveragePrice = commonSpinnerDecayingAveragePrice.add(amount.mul(5));
            commonSpinnerDecayingAveragePrice = commonSpinnerDecayingAveragePrice.div(100);
        }
        assert(!spinnerAsks[_spinnerId].isForSale);
        SpinnerBought(_spinnerId, amount, seller, bidder);
    }

    /**
     * @dev Cancel bid for the spinner.
     * @param _spinnerId id of the spinner with bid to be canceled
     */
    function withdrawBidForSpinner(uint _spinnerId) public validDeed(_spinnerId) onlyBidder(_spinnerId) {
        Bid memory bid = spinnerBids[_spinnerId];
        uint amount = bid.value;
        spinnerBids[_spinnerId] = Bid(0x0, _spinnerId, 0, false);
        SpinnerBidWithdrawn(_spinnerId, amount, msg.sender);
        asyncSend(msg.sender, amount);
    }

    function transfer(address _to, uint256 _spinnerId) public onlyOwnerOf(_spinnerId) {
        spinnerAsks[_spinnerId] = Ask(0x0, 0x0, _spinnerId, 0, false);
        super.transfer(_to, _spinnerId); // CSPIN Base Transfer
    }

    function _computeOwnerCut(uint256 _price) internal pure returns (uint256) {
        return _price.mul(OWNER_CUT_POINTS).div(HUNDRED_PERCENT);
    }

    function _computeGoldCut(uint256 _price) internal pure returns (uint256) {
        return _price.mul(OMEGA_CUT_POINTS).div(HUNDRED_PERCENT);
    }

    /**
     * @dev Pays owners of the omega spinners their cut. Each omega owner receives `_price / number of omega spinners`
     * @param _price amount to pay the omega spinner owners collectively.
     */
    function _payGoldHolders(uint256 _price) internal {
        for (uint i = 0; i < omegaSpinners.length; i++) {
            address holder = ownerOf(omegaSpinners[i].id);
            if (holder != address(this)) {
                uint256 amount = _price.div(omegaSpinners.length);
                asyncSend(holder, amount);
            }
        }
    }

}

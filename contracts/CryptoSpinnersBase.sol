pragma solidity ^0.4.18;

import './ReleaseCandidate.sol';
import './Accounts.sol';
import "zeppelin-solidity/contracts/math/SafeMath.sol";
/* import "zeppelin-solidity/contracts/token/ERC721/ERC721Token.sol"; */
import "./ERC721/ERC721Deed.sol";
import "./SafeMath32.sol";
import "./SafeMath16.sol";

contract VotingInterface {
    function getApprovedElectionAddress(uint256 _electionId, bool _approved) external returns (address _approvedAddress);
}

/**
 * @title CryptoSpinnersBase
 * @author team-cspin
 * @dev Base functionality of CryptoSpinners collectibles outside of standard ERC721 Deed functionality. Includes
 * minting, and initial purchasing.
 */
contract CryptoSpinnersBase is ERC721Deed, Accounts, ReleaseCandidate {

    using SafeMath for uint256;
    using SafeMath32 for uint32;
    using SafeMath16 for uint16;

    // For posterity's sake.
    // Unless someone implements a DAO to own spinners and therefore share fractions of ownership...  ;)
    uint8 public constant decimals = 0;

    mapping (address => bool) public energyModerators;
    VotingInterface public votingInterface;
    uint256 public PURCHASE_COMMON_PRICE = 2 finney; // 0.002 ETH
    uint256 public PURCHASE_UNCOMMON_PRICE = 25 finney; // 0.025 ETH
    uint256 public PURCHASE_RARE_PRICE = 100 finney; // 0.1 ETH
    uint256 public PURCHASE_LEGENDARY_PRICE = 500 finney; // 0.5 ETH
    enum Tier {
        Common, Uncommon, Rare, Legendary
    }
    uint16 seed = 13; // for good luck
    uint32 energyLimit = 4000000000;
    bool public isStillMinting;

    struct Spinner {
        bytes32 imageHash; // SHA256 hash of official spinner .png image
        uint256 id; // The unique identifier of the spinner
        uint32 energy; // Residual Rotational Energy -- a lifetime XP stat
        uint8 fluxcap; // Flux Capacitance -- a luck-like battle stat
        uint8 friction; // Bearing Friction -- battle stat and xp boost (low friction is better)
        uint8 inertia; // Rotational Inertia -- battle stat that decreases advantage of strong opponents
        Tier tier; // 4 tiers: common (0), uncommon (1), rare (2), legendary (3). Better tiers have better stats
    }

    // Continous array of spinners: 0, 1, 2, ..., totalDeeds
    Spinner[] public spinners;
    // Queues of unassigned spinners, one for each of the four tiers
    mapping (uint8 => mapping (uint16 => uint256)) public tierToUnassignedPositionToSpinnerId;
    mapping (uint8 => uint16) public tierToNumberOfUnassigned;

    Spinner[] public omegaSpinners;

    // TODO remove before release
    event Debug(uint256 position, string message);

    modifier costs(uint price) {
        require(msg.value >= price);
        _;
    }

    modifier stillMinting() {
        require(isStillMinting);
        _;
    }

    modifier spinnersForSale(Tier tier) {
        require(tierToNumberOfUnassigned[uint8(tier)] > 0);
        _;
    }

    modifier onlyEnergyModerators() {
        require(energyModerators[msg.sender]);
        _;
    }

    function CryptoSpinnersBase() public {
        isStillMinting = true;
        // Iterate once so seed changes
        _random(2);
    }

    function() public payable { }

    /**
     * @dev permanently disables the minting of new spinners
     */
    function finishMinting() external onlyOperator onlyOfficial {
        isStillMinting = false;
    }

    /**
     * @dev update the address of the seasons contract
     * @param _seasonsContract the new address of the CryptoSpinnersSeasons contract
     * @param _approved bool indicating whether to grant or take away privileges
     */
     function setSeasonsAddress(address _seasonsContract, bool _approved) external onlyOperator beforeOfficialRelease {
         energyModerators[_seasonsContract] = _approved;
     }

     /**
      * @dev Sets the voting contract that will (potentially) approve a one-time update to the seasons contract
      * @param _contractAddress the address of the voting contract
      */
     function setVotingContract(address _contractAddress) external onlyOperator beforeOfficialRelease {
         votingInterface = VotingInterface(_contractAddress);
     }

     /**
      * @dev Sets the address of the seasons contract if it has been approved.
      */
     function processElection(uint256 _electionId, bool _result) external {
         address contractAddress = votingInterface.getApprovedElectionAddress(_electionId, _result);
         energyModerators[contractAddress] = _result;
     }

     /**
      * @dev Increase the energy of the specified spinner.
      * @param _spinnerId id of spinner
      * @param _amount number of energy points to add to spinner
      */
     function increaseEnergy(uint256 _spinnerId, uint32 _amount) external onlyEnergyModerators validDeed(_spinnerId) {
         // If new energy level is above the limit, cap it
         if (energyLimit.sub(spinners[_spinnerId].energy) < _amount) {
             // Only need to update storage if it's not already at the limit. Storage updates are expensive
             if (spinners[_spinnerId].energy < energyLimit) {
                 spinners[_spinnerId].energy = energyLimit;
             }
         } else {
             spinners[_spinnerId].energy = spinners[_spinnerId].energy.add(_amount);
         }
     }

     /**
      * @dev Returns the energy value of the given spinner
      * @param _spinnerId id of spinner
      * @return uint32 energy of the given spinner
      */
     function getEnergy(uint256 _spinnerId) external view validDeed(_spinnerId) returns(uint32 energy) {
         return spinners[_spinnerId].energy;
     }

    /**
    * @dev Returns the 4 permanent properties of a spinner: flux capacitance, inertia, friction, and tier
    * @param _spinnerId id of spinner
    * @return uint8[4] array of properties in order (flux capacitance, inertia, friction, tier)
    */
    function getProperties(uint256 _spinnerId) external view validDeed(_spinnerId) returns(uint8 _fluxcap, uint8 _inertia, uint8 _friction, uint8 _tier) {
        // Storage or memory?
        Spinner storage spinner = spinners[_spinnerId];
        /* Debug(100, "success entered spinners"); */
        _fluxcap = spinner.fluxcap;
        _inertia = spinner.inertia;
        _friction = spinner.friction;
        _tier = uint8(spinner.tier);
    }

    /**
     * @dev Creates a new spinner with the specified properties
     * @param _imageHash a SHA256 hash of the spinner's image
     * @param _fluxCap uint256 in range [0, 255]
     * @param _friction uint256 in range [0, 255]
     * @param _inertia uint256 in range [0, 255]
     * @param _tier uint256 in range [0, 3]
     * @param _isGold bool true iff spinner should be awarded percentages of marketplace sales
     */
    function mintSpinner(bytes32 _imageHash, uint256 _fluxCap, uint256 _friction, uint256 _inertia, uint256 _tier, bool _isGold, bool _isReserved) public onlyOperator stillMinting {
        _mintSpinner(_imageHash, _fluxCap, _friction, _inertia, _tier, _isGold, _isReserved);
    }

    function _mintSpinner(bytes32 _imageHash, uint256 _fluxCap, uint256 _friction, uint256 _inertia, uint256 _tier, bool _isOmega, bool _isReserved) private {
        uint id = spinners.push(Spinner(_imageHash, 0, 1, uint8(_fluxCap), uint8(_friction), uint8(_inertia), Tier(_tier))) - 1;
        require(id < 65535);
        spinners[id].id = id;
        if (_isOmega) {
            omegaSpinners.push(spinners[id]);
        }
        // add ERC721 deed
        _mint(address(this), id);
        if (_isReserved) {
            clearApprovalAndTransfer(address(this), msg.sender, id);
        } else {
            // last unassigned position in tier set to id
            uint8 tier = uint8(_tier);
            tierToUnassignedPositionToSpinnerId[tier][tierToNumberOfUnassigned[tier]] = id;
            tierToNumberOfUnassigned[tier] = tierToNumberOfUnassigned[tier].add(1);
        }
    }

    /**
     * @dev Creates new spinners with specified properties. See mintSpinner
     */
    function bulkMintSpinner(bytes32[32] _imageHashes, uint256[32] _fluxCaps, uint256[32] _frictions, uint256[32] _inertias, uint256[32] _tiers, bool[32] _isOmegas, bool[32] _isReserved) external onlyOperator stillMinting {
        for (uint i = 0; i < 32; i++) {
            _mintSpinner(_imageHashes[i], _fluxCaps[i], _frictions[i], _inertias[i], _tiers[i], _isOmegas[i], _isReserved[i]);
        }
    }

    /**
     * @notice Purchase a random newly minted COMMON spinner for `PURCHASE_COMMON_PRICE` ETH
     * @dev assigns a random common spinner to msg.sender for `PURCHASE_COMMON_PRICE` ETH
     * @return spinnerId of the randomly chosen spinner
     */
    function purchaseCommonSpinner() external payable costs(PURCHASE_COMMON_PRICE) onlyReleased spinnersForSale(Tier.Common) {
        _refundExtraToSender(PURCHASE_COMMON_PRICE);
        uint16 randIndex = _random(tierToNumberOfUnassigned[uint8(Tier.Common)] - 1);
        _assignSpinner(randIndex, uint8(Tier.Common));
    }

    /**
     * @notice Purchase a random newly minted UNCOMMON spinner for `PURCHASE_UNCOMMON_PRICE` ETH
     * @dev assigns a random uncommon spinner to msg.sender for `PURCHASE_UNCOMMON_PRICE` ETH
     * @return spinnerId of the randomly chosen spinner
     */
    function purchaseUncommonSpinner() external payable costs(PURCHASE_UNCOMMON_PRICE) onlyReleased spinnersForSale(Tier.Uncommon) {
        _refundExtraToSender(PURCHASE_UNCOMMON_PRICE);
        uint16 randIndex = _random(tierToNumberOfUnassigned[uint8(Tier.Uncommon)] - 1);
        _assignSpinner(randIndex, uint8(Tier.Uncommon));
    }

    /**
     * @notice Purchase a random newly minted RARE spinner for `PURCHASE_RARE_PRICE` ETH
     * @dev assigns a random rare spinner to msg.sender for `PURCHASE_RARE_PRICE` ETH
     * @return spinnerId of the randomly chosen spinner
     */
    function purchaseRareSpinner() external payable costs(PURCHASE_RARE_PRICE) onlyReleased spinnersForSale(Tier.Rare) {
        _refundExtraToSender(PURCHASE_RARE_PRICE);
        uint16 randIndex = _random(tierToNumberOfUnassigned[uint8(Tier.Rare)] - 1);
        _assignSpinner(randIndex, uint8(Tier.Rare));
    }

    /**
     * @notice Purchase a random newly minted LEGENDARY spinner for `PURCHASE_LEGENDARY_PRICE` ETH
     * @dev assigns a random legendary spinner to msg.sender for `PURCHASE_LEGENDARY_PRICE` ETH
     * @return spinnerId of the randomly chosen spinner
     */
    function purchaseLegendarySpinner() external payable costs(PURCHASE_LEGENDARY_PRICE) onlyReleased spinnersForSale(Tier.Legendary) {
        _refundExtraToSender(PURCHASE_LEGENDARY_PRICE);
        uint16 randIndex = _random(tierToNumberOfUnassigned[uint8(Tier.Legendary)] - 1);
        _assignSpinner(randIndex, uint8(Tier.Legendary));
    }

    function transfer(address _to, uint256 _spinnerId) public onlyOwnerOf(_spinnerId) {
        require(_to != address(this));
        super.transfer(_to, _spinnerId); // ERC721Deed transfer
    }

    /**
     * @dev return a pseudo random number between zero and upper bounds given the number of previous blocks it should
     * hash. Note: This pseudo random function is not very secure, but based on initial prices of the spinners, battle
     * mechanics and current mining reward, this function is acceptable (it is not advantageous for the miner to
     * sacrifice the block in order to manipulate this random number). Taken from:
     * https://github.com/axiomzen/eth-random/blob/master/contracts/Random.sol
     * @param _upper highest possible random number to return
     */
    function _random(uint16 _upper) internal returns (uint16 randomNumber) {
        if (_upper == 0) {
            return 0;
        }
        seed = uint16(keccak256(keccak256(block.blockhash(block.number), seed), now));
        return seed % _upper;
    }

    /**
     * @dev assigns the given spinner to msg.sender. Updates tierToUnassignedPositionToSpinnerId to keep
     * track of unassigned spinners and follows standard NFT transfer procedure.
     * @param index position of the spinner in tierToUnassignedPositionToSpinnerId
     * @return spinnerId of the specified spinner
     */
    function _assignSpinner(uint16 index, uint8 tier) private {
        uint256 spinnerId = tierToUnassignedPositionToSpinnerId[tier][index];
        require(spinners[spinnerId].tier == Tier(tier));
        // If random position is not the last, then move the last spinnerId into the random position to maintain a
        //  continuous sequence of positions
        if (index != tierToNumberOfUnassigned[tier] - 1) {
            uint256 swapSpinnerId = tierToUnassignedPositionToSpinnerId[tier][tierToNumberOfUnassigned[tier] - 1];
            tierToUnassignedPositionToSpinnerId[tier][index] = swapSpinnerId;
        }
        // Update number of unassigned to relfect the new purchase
        tierToNumberOfUnassigned[tier] = tierToNumberOfUnassigned[tier].sub(1);
        // transfer ownership
        clearApprovalAndTransfer(address(this), msg.sender, spinnerId);
    }

}

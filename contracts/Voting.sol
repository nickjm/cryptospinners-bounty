pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "./ERC721/ERC721.sol";

contract Voting is Ownable {

    ERC721 public deedInterface;
    // VOTING_DURATION is hardcoded to a week so that the dev team can't make a malicious update and approve it
    // before community would have time to vote.
    uint256 public constant VOTING_DURATION = 1 weeks;
    bool public deedContractSet = false;

    enum Phase {
        Standby,
        Live,
        Finished
    }

    enum Vote {
        Null,
        Against,
        For
    }

    struct Election {
        mapping (uint256 => Vote) spinnerToVote;
        address proposedContract;
        uint256 beginVotingTime;
        Phase phase;
        bool approved;
    }

    Election[] public elections;

    /**
     * @dev Sets the contract address for the core deed contract that tracks deed ownership according to ERC721. Can
     * only be set once to prevent contract owner from sabotaging any ongoing elections.
     * @param _contractAddress the address of the ERC721 contract.
     */
    function setDeedContract(address _contractAddress) external onlyOwner {
        require(!deedContractSet);
        deedInterface = ERC721(_contractAddress);
        deedContractSet = true;
    }

    /**
     * @dev Creates a new election in standby phase with a blank slate of votes. Only the owner can start and activate
     * an election for security and quality assurance purposes i.e. a malicious actor could have an election for a
     * seemingly benign layer 2 CryptoSpinners contract that actually has a vulnerability putting the Energy of
     * everyone's Spinners at risk.
     * @param _contractAddress the address of the new proposed contract
     */
    function createElection(address _contractAddress) external onlyOwner {
        require(_contractAddress != 0x0);
        Election memory newElection;
        newElection.proposedContract = _contractAddress;
        newElection.phase = Phase.Standby;
        elections.push(newElection);
    }

    /**
     * @dev Activates the voting period if current phase is standby and deeds contract has been set.
     * @param _electionId id of the election to start
     */
    function activateVoting(uint256 _electionId) external onlyOwner {
        require(address(deedInterface) != 0x0);
        Election storage election = elections[_electionId];
        require(election.phase == Phase.Standby);
        election.beginVotingTime = now;
        election.phase = Phase.Live;
    }

    /**
     * @dev cast the vote for given deed. If deed ownership changes during the voting period, the new owner can simply
     * call this function to overwrite the previous vote.
     * @param _deedId the id of the deed casting a vote
     * @param _vote 0 is NULL, 1 is Against, 2 is For (in favor of approving the update)
     */
    function castVote(uint256 _electionId, uint256 _deedId, uint8 _vote) external {
        Election storage election = elections[_electionId];
        require(election.phase == Phase.Live);
        require(deedInterface.ownerOf(_deedId) == msg.sender);
        election.spinnerToVote[_deedId] = Vote(_vote);
    }

    /**
     * @dev finishes the voting process after `VOTING_DURATION` time has passed since the voting began.
     * Anyone can call this function so that the contract owner can't block the update if disatisfied with the result
     * Of course we expect to call these functions ourselves so the community doesn't have to wait, nor pay gas.
     * @param _electionId the id of the election to tally
     */
    function finishVoting(uint256 _electionId) external {
        Election storage election = elections[_electionId];
        require(election.phase == Phase.Live);
        require(now >= election.beginVotingTime + VOTING_DURATION);
        uint16 votesToApprove = 0;
        uint16 votesToBlock = 0;
        for (uint i = 0; i < deedInterface.countOfDeeds(); i++) {
            if (election.spinnerToVote[i] == Vote.For) {
                votesToApprove += 1;
            } else if (election.spinnerToVote[i] == Vote.Against) {
                votesToBlock += 1;
            }
        }
        if (votesToApprove > votesToBlock) {
            election.approved = true;
        }
        election.phase = Phase.Finished;
    }

    /**
     * @dev Retrieves the candidate address of a FINISHED election. This function will fail unless the election is
     * finished and desired result matches the `_approved` param
     * @param _electionId id of the election to inspect
     * @param _approved the expected result of the election to confirm
     */
    function getApprovedElectionAddress(uint256 _electionId, bool _approved) external view returns (address _candidateAddress) {
        Election memory election = elections[_electionId];
        require(election.phase == Phase.Finished);
        require(election.approved == _approved);
        return election.proposedContract;
    }
}

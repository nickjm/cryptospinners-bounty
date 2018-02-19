pragma solidity ^0.4.18;

import "./AccessControl.sol";

/**
 * @title ReleaseCandidate
 * @author team-cspin
 * @dev This contract provides modifiers based on the phase of the release cycle. Can be destroyed by owner before
 * Beta. All funds in contract will be sent to the owner. Partly based on OpenZeppelin Destructible.
 * https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/lifecycle/Destructible.sol
 *
 * Phases and modifiers:
 *
 * |      Deployed      ||      Beta      ||      Official      |
 * |--- beforeRelease --||------------ onlyReleased ------------|
 * |----------- beforeOfficial -----------||--- onlyOfficial ---|
 *
 */

contract ReleaseCandidate is AccessControl {

    enum LaunchPhase {
        Deployed,
        Beta,
        Official
    }

    LaunchPhase public phase;

    modifier onlyReleased() {
        require(phase != LaunchPhase.Deployed);
        _;
    }

    modifier beforeRelease() {
        require(phase == LaunchPhase.Deployed);
        _;
    }

    modifier beforeOfficialRelease() {
        require(phase != LaunchPhase.Official);
        _;
    }

    modifier onlyOfficial() {
        require(phase == LaunchPhase.Official);
        _;
    }

    function ReleaseCandidate() public {
        phase = LaunchPhase.Deployed;
    }

    /**
     * @dev advances the contract to the next phase (Deployed, Alpha Release, Beta Release, Official Release)
     */
    function nextState() external onlyOwner {
        if (phase == LaunchPhase.Beta) {
            phase = LaunchPhase.Official;
        }
        else if (phase == LaunchPhase.Deployed) {
            phase = LaunchPhase.Beta;
        }
    }

    /**
     * @dev Transfers the current balance to the owner and terminates the contract.
     * TODO change to `beforeRelease` before mainnet launch
     */
    function destroy() public onlyOwner {
        selfdestruct(owner);
    }

}

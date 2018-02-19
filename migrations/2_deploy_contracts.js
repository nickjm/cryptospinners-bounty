var SafeMath16 = artifacts.require("./SafeMath16.sol");
var SafeMath32 = artifacts.require("./SafeMath32.sol");
var SafeMath = artifacts.require("zeppelin-solidity/contracts/math/SafeMath.sol");
var CryptoSpinners = artifacts.require("./CryptoSpinners.sol");
// var CryptoSpinnersSeasons = artifacts.require("./CryptoSpinnersSeasons.sol");
var Voting = artifacts.require("./Voting.sol");

module.exports = function(deployer) {
  deployer.deploy(SafeMath16);
  deployer.deploy(SafeMath32);
  deployer.deploy(SafeMath);
  deployer.link(SafeMath16, CryptoSpinners);
  deployer.link(SafeMath32, CryptoSpinners);
  deployer.link(SafeMath, CryptoSpinners);
  deployer.deploy(CryptoSpinners, {gas: 6990000, gasPrice: 100000000});
  // deployer.deploy(CryptoSpinnersSeasons, {gas: 6990000, gasPrice: 100000000});
  deployer.deploy(Voting, {gas: 6990000, gasPrice: 100000000});
};

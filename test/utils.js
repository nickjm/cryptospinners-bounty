const BigNumber = require('bignumber.js');
var _ = require("lodash");

module.exports = {

    preMint: async function (cspin, quantity, owner, operations) {
        var imagehash = web3.sha3("imagehash");
        await cspin.setOperator(operations, {from: owner});
        for (var i = 0; i < quantity; i++) {
            await cspin.mintSpinner(imagehash, 1, 2, 3, 0, false, false, {from: operations});
        }
    },

    mintAllTiers: async function (cspin, quantity, owner, operations) {
        var imagehash = web3.sha3("imagehash");
        await cspin.setOperator(operations, {from: owner});
        for (var i = 0; i < quantity; i++) {
            await cspin.mintSpinner(imagehash, 0, 0, 0, 0, false, false, {from: operations});
        }
        for (var i = 0; i < quantity; i++) {
            await cspin.mintSpinner(imagehash, 0, 0, 0, 1, false, false, {from: operations});
        }
        for (var i = 0; i < quantity; i++) {
            await cspin.mintSpinner(imagehash, 0, 0, 0, 2, false, false, {from: operations});
        }
        for (var i = 0; i < quantity; i++) {
            await cspin.mintSpinner(imagehash, 0, 0, 0, 3, false, false, {from: operations});
        }
    },

    release: async function (releaseCandidate, owner) {
        await releaseCandidate.nextState({from: owner});
    },

    officialRelease: async function (releaseCandidate, owner) {
        assert.equal(1, await releaseCandidate.phase.call()); // Should be in Beta
        await releaseCandidate.nextState({from: owner});
        assert.equal(2, await releaseCandidate.phase.call());
    },

    assertEventType: function(response, eventType) {
        assert.equal(response['logs'][0]['event'], eventType, 'transfer event should fire');
    },

    assertApprovalEvent: function(response, owner, approvee, spinnerId, index) {
        assert.equal(response['logs'][index]['event'], 'Approval', 'approval event should fire');
        assert.equal(response['logs'][index]['args']['owner'], owner, 'approval event should exist from ' + owner + ' to ' + approvee + ' for ' + spinnerId);
        assert.equal(response['logs'][index]['args']['approved'], approvee, 'approval event should exist from ' + owner + ' to ' + approvee + ' for ' + spinnerId);
        assert.equal(response['logs'][index]['args']['deedId']['c'][0], spinnerId, 'approval event should exist from ' + owner + ' to ' + approvee + ' for ' + spinnerId);
    },

    assertTransferEvent: function(response, from, to, spinnerId, index) {
        assert.equal(response['logs'][index]['event'], 'Transfer', 'transfer event should fire');
        assert.equal(response['logs'][index]['args']['from'], from, 'transfer event should exist from ' + from + ' to ' + to + ' for ' + spinnerId);
        assert.equal(response['logs'][index]['args']['to'], to, 'transfer event should exist from ' + from + ' to ' + to + ' for ' + spinnerId);
        assert.equal(response['logs'][index]['args']['deedId']['c'][0], spinnerId, 'transfer event should exist from ' + from + ' to ' + to + ' for ' + spinnerId);
    },

    assertBattleRequestEvent: function(response, initiator, opponent, initiatorSpinner, index) {
        // console.log(response.logs[index]);
        assert.equal(response.logs[index].event, 'PrivateBattleRequest', 'PrivateBattleRequest event should fire.');
        assert.equal(response.logs[index].args.initiator, initiator, 'Initiator should be '+initiator);
        assert.equal(response.logs[index].args.opponent, opponent, 'Opponent should be '+opponent);
        assert.equal(response.logs[index].args.initiatorSpinner, initiatorSpinner, 'Spinner should be '+initiatorSpinner);
    },

    assertBattleResultEvent: function(response, challenger, defender, challengerSpinner, defenderSpinner, index) {
        assert.equal(response.logs[index].event, 'BattleResult', 'BattleResult event should fire.');
        assert.equal(response.logs[index].args.challenger, challenger, 'Challenger should be '+challenger);
        assert.equal(response.logs[index].args.defender, defender, 'Defender should be '+defender);
        assert.equal(response.logs[index].args.challengerSpinner, challengerSpinner, 'Challenger Spinner should be '+challengerSpinner);
        assert.equal(response.logs[index].args.defenderSpinner, defenderSpinner, 'Defender Spinner should be '+defenderSpinner);
    },

    assertSeasonWinnerEvent: function(response, winningSpinner, winningAddress, position, index) {
        assert.equal(response.logs[index].event, 'SeasonWinner', 'SeasonWinner event should fire.');
        assert.equal(response.logs[index].args.winningSpinner, winningSpinner, 'Winner Spinner should be '+winningSpinner);
        assert.equal(response.logs[index].args.winningAddress, winningAddress, 'Winning Address should be '+winningAddress);
        assert.equal(response.logs[index].args.position, position, 'Position should be '+position);
    },

    assertLottoWinnerEvent: function(response, winningSpinner, winningAddress, index) {
        assert.equal(response.logs[index].event, 'LottoWinner', 'LottoWinner event should fire.');
        assert.equal(response.logs[index].args.winningSpinner, winningSpinner, 'Lotto Winner Spinner should be '+winningSpinner);
        assert.equal(response.logs[index].args.winningAddress, winningAddress, 'Lotto Winning Address should be '+winningAddress);
    },

    doTxnAndCompareBalance: async function(txn, acct, amount) {
        var previousBalance = await web3.eth.getBalance(acct);
        var resp = await txn();
        var gasUsed = Number(resp['receipt']['gasUsed']);
        // console.log(resp);
        var currentBalance = await web3.eth.getBalance(acct);
        var gasPrice;
        // checkBalanceWithGas = function(err, res) {
        //     // console.log(Number(res));
        //     // console.log(100000000000);
        //     gasPrice = Number(res); // This price is wrong for some reason :( TODO figure out why
        //     assert.equal(Number(String(currentBalance)), Number(String(previousBalance)) + amount - (gasUsed * gasPrice), 'Account balance for ' + String(acct) + ' incorrect after txn.');
        // }
        // await web3.eth.getGasPrice(checkBalanceWithGas);
        assert.equal(Number(currentBalance), Number(previousBalance) + amount - (gasUsed * 100000000000), 'Account balance for ' + String(acct) + ' incorrect after txn.');
    },

    compareBalance: async function(account, receipt, previousBalance, diff) {
        // console.log(receipt);
        var gasPrice = new BigNumber(100000000000);
        var gasUsed = new BigNumber(receipt['gasUsed']);
        var currentBalance = new BigNumber(await web3.eth.getBalance(account));
        var expected = previousBalance.minus(gasUsed.times(gasPrice)).plus(diff);
        assert.equal(currentBalance.toString(), expected.toString(), 'Account balance for ' + String(account) + ' incorrect after txn.');
    },

    // TODO Deprecated
    expectThrow: async function(promise, lookForRevert) {
        try {
            var resp = await promise;
            // console.log("resp:");
            // console.log(resp);
        } catch (error) {
            // console.log("error");
            // console.log(error.data);
            if (lookForRevert) {
                const revertEvent = error.message.search('revert') >= 0;
                assert(
                  revertEvent,
                  "Expected revert, got '" + error + "' instead",
                );
                return;
            } else {
                // TODO: Check jump destination to destinguish between a throw
                //       and an actual invalid jump.
                const invalidOpcode = error.message.search('invalid opcode') >= 0;
                const invalidJump = error.message.search('invalid JUMP') >= 0;
                // TODO: When we contract A calls contract B, and B throws, instead
                //       of an 'invalid jump', we get an 'out of gas' error. How do
                //       we distinguish this from an actual out of gas event? (The
                //       testrpc log actually show an 'invalid jump' event.)
                const outOfGas = error.message.search('out of gas') >= 0;
                assert(
                  invalidOpcode | invalidJump | outOfGas,
                  "Expected throw, got '" + error + "' instead",
                );
                return;
            }
        }
        assert(false, 'Expected throw not received');
    },

    assertRevert: async function(promise) {
        try {
            var resp = await promise;
            assert(false, 'Expected throw not received');
        } catch (error) {
            const revertEvent = error.message.search('revert') >= 0;
            assert(
              revertEvent,
              "Expected revert, got '" + error + "' instead",
            );
        }
    },

    assertThrow: async function(promise) {
        try {
            var resp = await promise;
            assert(false, 'Expected throw not received');
        } catch (error) {
            const invalidOpcode = error.message.search('invalid opcode') >= 0;
            const outOfGas = error.message.search('out of gas') >= 0;
            assert(
              invalidOpcode | outOfGas,
              "Expected throw, got '" + error + "' instead",
            );
            return;
        }
    }
}

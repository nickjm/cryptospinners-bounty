# CryptoSpinners Bounty Program
The CryptoSpinners team values security and transparency both for its importance to our project and to the Ethereum Community at large. For this reason we're launching a bounty program for finding bugs and vulnerabilities in our code.

Special thank you and credit to CryptoKitties for sharing this bounty program publicly. We use their bounty program as a template. [CryptoKitties Bounty](https://github.com/axiomzen/cryptokitties-bounty)

### CryptoSpinners in a Few Words:

- CryptoSpinners are truly decentralized Ethereum based blockchain collectibles that can be bought, traded, and competitively battled for weekly ETH rewards. There are 20,000 CryptoSpinners that each possesses a unique combination of form factor, texture, stats, luck, and other features.
- [Introduction](https://medium.com/@cryptospinners.io/introducing-cryptospinners-collect-trade-and-battle-fidget-spinners-on-the-ethereum-network-2fd8315665f3)
- [Battle Mechanics Overview](https://medium.com/@cryptospinners.io/cryptospinners-battle-mechanics-explained-5d85d7a0163f)
- [Tier System](https://medium.com/@cryptospinners.io/cryptospinners-tier-system-explained-71c149d34493)
- [Seasons of Battling and Leagues](https://medium.com/@cryptospinners.io/cryptospinners-leagues-leaderboards-and-payouts-explained-c7912aa128e4)

### The Scope for this Bounty Program:

This bounty program schedule:
- Core contract: <b>5:00pm GMT February 18th - 5:00am GMT February 21st, 2017</b>.
- Seasons contract (will be added soon): <b>5:00pm GMT February 20th - 5:00am GMT February 24th, 2017</b>.
- **Rewards are ONLY distributed if CryptoSpinners generates enough revenue to cover costs**. We have a limited budget, and accordingly will be using our revenue to reward bounty participants. See the Payment Schedule below.

All code important to this bounty program is publicly available within this repo
Help us identify bugs, vulnerabilities, and exploits in the smart contract such as:
- Breaking the game (ex. market doesn’t work, battling doesn’t work,)
- Incorrect usage of the game
- Steal a spinner from someone else
- Act as one of the admin accounts
- Use spin, wins, losses from last season
- Any sort of malfunction

### Rules & Rewards:

- Issues that have already been submitted by another user or are already known to the CryptoSpinners team are not eligible for bounty rewards. WE RESERVE THE RIGHT TO TEMPORARILY PAUSE THE BOUNTY IF AN URGENT UPDATE IS NEEDED. Any updates regarding such as situation will be announced on [our Discord](https://discord.gg/wbRas2Q)
- Bugs and vulnerabilities should only be found using accounts you own and create. Please respect third party applications and understand that an exploit that is not specific to the CryptoSpinners smart contract is not part of the bounty program. Attacks on the network that result in bad behavior are not allowed.
- The CryptoSpinners website is not part of the bounty program, only the smart contract code included in this repo.
- The CryptoSpinners bounty program considers a number of variables in determining rewards. Determinations of eligibility, score and all terms related to a reward are at the sole and final discretion of CryptoSpinners team.
- Reports will only be accepted via GitHub issues submitted to this repo.
- In general, please investigate and report bugs in a way that makes a reasonable, good faith effort not to be disruptive or harmful to us or others.

The value of rewards paid out will vary depending on Severity which is calculated based on Impact and Likelihood as followed by  [OWASP](https://www.owasp.org/index.php/OWASP_Risk_Rating_Methodology):

![Alt text](https://github.com/axiomzen/cryptokitties-bounty/blob/master/owasp_w600.png)

<b>Note: Rewards are at the sole discretion of the CryptoSpinners Team. 1 point currently corresponds to 0.5 USD (paid in ETH) The top 10 people on our leaderboard of accepted bugs with at least 250 points will additionally receive a free spinner available only to successful participants in this bounty program.</b>

- Critical: up to 1000 points
- High: up to 500 points
- Medium: up to 250 points
- Low: up to 125 points
- Note: up to 50 points

<b> Examples of Impact: </b>
- High: Steal a spinner from someone, steal/redirect ETH or spinners to another address, change any spinner stats, block actions for all users or some non-trivial fraction of users, create a new spinner. Make yourself win a top payout, or another user miss their top payout (top payout is any gold or silver league payouts), make yourself win the lottery. Break any contract ETH balances. Access functions only Operator / Treasurer should access...
- Medium: Break game rules (exploit leaderboards, league placement or matchmaking, battle victor), lock a single spinner owned by an address you don't control, manipulate the price of a single battle.
- Low: Block a user from market transactions. Purchase a spinner for less than sale price.. Block a single battle. Purchase an exact spinner (break the random distribution mechanism).

<b>Suggestions for Getting the Highest Score:</b>
- Description: Be clear in describing the vulnerability or bug. Ex. share code scripts, screenshots or detailed descriptions.
- Fix it: if you can suggest how we fix this issue in an appropriate manner, higher points will be rewarded.

<b>CryptoSpinners appreciates you taking the time to participate in our program, which is why we’ve created rules for us too:</b>  
- We will respond as quickly as we can to your submission (within 3 days).
- Let you know if your submission will qualify for a bounty (or not) within 7 business days.
- We will keep you updated as we work to fix the bug you submitted.
- CryptoSpinners' core development team, employees and all other people paid by the CryptoSpinners project, are not eligible for rewards.

<b>How to Create a Good Vulnerability Submission:</b>
- <b>Description:</b> A brief description of the vulnerability
- <b>Scenario:</b> A description of the requirements for the vulnerability to happen
- <b>Impact:</b> The result of the vulnerability and what or who can be affected
- <b>Reproduction:</b> Provide the exact steps on how to reproduce this vulnerability on a new contract, and if possible, point to specific tx hashes or accounts used.
- <b>Note:</b> If we can't reproduce with given instructions then a (Truffle) test case will be required.
- <b>Fix:</b> If applies, what would would you do to fix this

<b>FAQ:</b>
- How are the bounties paid out?
  - Rewards are paid out in ETH after launch (assuming the submission has been validated). Please provide your ETH address.
- I reported an issue but have not received a response!
  - We aim to respond to submissions as fast as possible. Feel free to email us if you have not received a response.
- Can I use this code elsewhere?
  - No. Please do not copy this code for other purposes than reviewing it.  
- I have more questions!
  - Create a new issue with the title starting as “QUESTION”
- Will the code change during the bounty?
  - Yes, as issues are reported we will update the code as soon as possible. Please make sure your bugs are reported against the latest versions of the published code.
- I'm having trouble setting up the contracts?
  - Join the [CryptoSpinners Discord](https://discord.gg/wbRas2Q)

<b>Payment Schedule:</b>
We have a limited budget so we are paying bounty participants with the revenue of CryptoSpinners. Here is the order in which funds will be disbursed:
- FIRST Reimbursements for deploy costs (deploying contract, minting spinners)
- SECOND Rewards for bounty participants (in order of submission)
- LAST Revenue sharing with CryptoSpinners team
If we DO NOT generate enough revenue through the CryptoSpinners contract or any contract that directly and explicitly
replaces it, you MAY not be eligible to redeem your points for ETH payouts.

<b>Important Legal Information:</b>

The bug bounty program is an experimental rewards program for our community to encourage and reward those who are helping us to improve CryptoSpinners. You should know that we can close the program at any time, and rewards are at the sole discretion of the CryptoSpinners team. All rewards are subject to applicable law and thus applicable taxes. Don't target our physical security measures, or attempt to use social engineering, spam, distributed denial of service (DDOS) attacks, etc. Lastly, your testing must not violate any law or compromise any data that is not yours.

SOFTWARE LICENSE

Copyright (c) 2018 Nicholas Matthews

All rights reserved. The contents of this repository is provided for review and educational purposes ONLY. You MAY NOT use, copy, distribute, or modify this software without express written permission from Nicholas Matthews.

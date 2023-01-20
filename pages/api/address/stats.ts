/*

SPDX-FileCopyrightText: © 2023 Dai Foundation <www.daifoundation.org>

SPDX-License-Identifier: AGPL-3.0-or-later

*/

import invariant from 'tiny-invariant';
import { NextApiRequest, NextApiResponse } from 'next';
import { isSupportedNetwork } from 'modules/web3/helpers/networks';
import { AddressAPIStats } from 'modules/address/types/addressApiResponse';
import { fetchAddressPollVoteHistory } from 'modules/polling/api/fetchAddressPollVoteHistory';
import withApiHandler from 'modules/app/api/withApiHandler';
import { DEFAULT_NETWORK, SupportedNetworks } from 'modules/web3/constants/networks';
import { resolveENS } from 'modules/web3/helpers/ens';
import { getAddressStatsCacheKey } from 'modules/cache/constants/cache-keys';
import { cacheGet, cacheSet } from 'modules/cache/cache';
import { TEN_MINUTES_IN_MS } from 'modules/app/constants/time';
import { ApiError } from 'modules/app/api/ApiError';
import { isValidAddressParam } from 'pages/api/polling/isValidAddressParam';
import validateQueryParam from 'modules/app/api/validateQueryParam';

/**
 * @swagger
 * definitions:
 *   ArrayOfVoteHistory:
 *     type: array
 *     items:
 *       $ref: '#/definitions/VoteHistory'
 *   VoteHistory:
 *     type: object
 *     properties:
 *       pollId:
 *         type: integer
 *       blockTimestamp:
 *         type: string
 *       option:
 *         type: number
 *       optionValue:
 *         type: array
 *         items:
 *           type: string
 *       ballot:
 *         type: array
 *         items:
 *           type: integer
 *       poll:
 *         $ref: '#/definitions/Poll'
 *     example:
 *       - pollId: 1
 *         blockTimestamp: "2021-11-20T19:25:47+00:00"
 *         option: 1
 *         optionValue: ["Yes"]
 *         ballot: [1]
 *         poll:
 *           pollId: 1
 *   AddressStats:
 *     type: object
 *     properties:
 *       pollVoteHistory:
 *         $ref: '#/definitions/ArrayOfVoteHistory'
 *       lastVote:
 *         $ref: '#/definitions/VoteHistory'
 *
 * /api/address/stats:
 *   get:
 *     tags:
 *     - "address"
 *     description: Returns stats for address
 *     produces:
 *     - "application/json"
 *     parameters:
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         required: true
 *         description: Address to check
 *     responses:
 *       '200':
 *         description: "Stats of the address"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/AddressStats'
 *
 */
export default withApiHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  // validate network
  const network = validateQueryParam(
    (req.query.network as SupportedNetworks) || DEFAULT_NETWORK.network,
    'string',
    {
      defaultValue: null,
      validValues: [SupportedNetworks.GOERLI, SupportedNetworks.GOERLIFORK, SupportedNetworks.MAINNET]
    }
  ) as SupportedNetworks;

  if (!network) {
    throw new ApiError('Invalid network', 400, 'Invalid network');
  }

  if (!req.query.address) {
    throw new ApiError('Address stats, missing address', 400, 'Missing address');
  }

  if (!isValidAddressParam(req.query.address as string)) {
    throw new ApiError('Invalid address', 400, 'Invalid address');
  }

  const tempAddresses =
    typeof req.query.address === 'string'
      ? [req.query.address.toLowerCase()]
      : (req.query.address as string[]);

  invariant(isSupportedNetwork(network), `unsupported network ${network}`);

  const cacheKey = getAddressStatsCacheKey(tempAddresses);

  const cachedResponse = await cacheGet(cacheKey, network);
  if (cachedResponse) {
    return res.status(200).json(JSON.parse(cachedResponse));
  }

  const addresses = await Promise.all(
    tempAddresses.map(async tempAddress => {
      return tempAddress.indexOf('.eth') !== -1 ? await resolveENS(tempAddress) : tempAddress;
    })
  );

  const pollVoteHistories = await Promise.all(
    addresses
      .filter(a => !!a)
      .map(async (address: string) => {
        const pollVoteHistory = await fetchAddressPollVoteHistory(address, network);

        return pollVoteHistory;
      })
  );

  const combinedPollVoteHistory = pollVoteHistories.flat();
  const response: AddressAPIStats = {
    pollVoteHistory: combinedPollVoteHistory,
    lastVote: combinedPollVoteHistory.sort((a, b) => (a.blockTimestamp > b.blockTimestamp ? -1 : 1))[0]
  };

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate');
  cacheSet(cacheKey, JSON.stringify(response), network, TEN_MINUTES_IN_MS);
  res.status(200).json(response);
});

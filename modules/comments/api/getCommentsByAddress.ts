import connectToDatabase from 'modules/db/helpers/connectToDatabase';
import { SupportedNetworks, getGaslessNetwork, getGaslessProvider, getProvider } from 'modules/web3/constants/networks';
import { getAddressInfo } from 'modules/address/api/getAddressInfo';
import invariant from 'tiny-invariant';
import { CommentFromDB, CommentsAPIResponseItem } from '../types/comments';
import { markdownToHtml } from 'lib/markdown';
import { networkNameToChainId } from 'modules/web3/helpers/chain';
import { getRPCFromChainID } from 'modules/web3/helpers/getRPC';
import { ethers } from 'ethers';
import { getCommentTransaction } from './getCommentTransaction';

export async function getCommentsByAddress(
  address: string,
  network: SupportedNetworks
): Promise<{
  comments: CommentsAPIResponseItem[];
}> {
  const { db, client } = await connectToDatabase;

  invariant(await client.isConnected(), 'mongo client failed to connect');

  const addressInfo = await getAddressInfo(address, network);
  const addresses = [address.toLowerCase()];

  if (addressInfo.delegateInfo?.previous?.address) {
    addresses.push(addressInfo.delegateInfo?.previous?.voteDelegateAddress.toLowerCase());
  }
  const gaslessNetwork = getGaslessNetwork(network);
  // decending sort
  const commentsFromDB: CommentFromDB[] = await db
    .collection('comments')
    .find({ voterAddress: { $in: addresses }, network: { $in: [network, gaslessNetwork] } })
    .sort({ date: -1 })
    .toArray();

  const provider = await getProvider(network);
  const gaslessProvider = await getGaslessProvider(network);
  const providers = {[network]: provider, [gaslessNetwork]: gaslessProvider};

  const comments: CommentsAPIResponseItem[] = await Promise.all(
    commentsFromDB.map(async comment => {
      const { _id, ...rest } = comment;
      const commentBody = await markdownToHtml(comment.comment, true);
      // verify tx ownership
      const { transaction, isValid } = await getCommentTransaction(network, providers[comment.network], comment);

      return {
        comment: {
          ...rest,
          comment: commentBody
        },
        isValid,
        completed: transaction && transaction.confirmations > 10,

        address: addressInfo
      };
    })
  );

  return {
    comments
  };
}

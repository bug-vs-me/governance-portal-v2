import { initializeConnector, Web3ReactHooks } from '@web3-react/core';
import { Connector } from '@web3-react/types';
import { Network } from '@web3-react/network';
import { MetaMask } from '@web3-react/metamask';
import { GnosisSafe } from '@web3-react/gnosis-safe';
import { getRPCFromChainID } from '../helpers/getRPC';
import { SupportedChainId } from '../constants/chainID';

export interface Connection {
  connector: Connector;
  hooks: Web3ReactHooks;
  type: ConnectionType;
}

export enum ConnectionType {
  INJECTED = 'INJECTED',
  COINBASE_WALLET = 'COINBASE_WALLET',
  WALLET_CONNECT = 'WALLET_CONNECT',
  NETWORK = 'NETWORK',
  GNOSIS_SAFE = 'GNOSIS_SAFE'
}

const [web3Network, web3NetworkHooks] = initializeConnector<Network>(
  actions =>
    new Network({
      actions,
      urlMap: { [SupportedChainId.MAINNET]: getRPCFromChainID(SupportedChainId.MAINNET) },
      defaultChainId: 1
    })
);
export const networkConnection: Connection = {
  connector: web3Network,
  hooks: web3NetworkHooks,
  type: ConnectionType.NETWORK
};

const [web3Injected, web3InjectedHooks] = initializeConnector<MetaMask>(actions => new MetaMask({ actions }));
export const injectedConnection: Connection = {
  connector: web3Injected,
  hooks: web3InjectedHooks,
  type: ConnectionType.INJECTED
};

const [web3GnosisSafe, web3GnosisSafeHooks] = initializeConnector<any>(
  actions => new GnosisSafe({ actions })
);
export const gnosisSafeConnection: Connection = {
  connector: web3GnosisSafe as any,
  hooks: web3GnosisSafeHooks,
  type: ConnectionType.GNOSIS_SAFE
};
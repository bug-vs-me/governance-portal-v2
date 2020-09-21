/** @jsx jsx */

import React from 'react';
import { jsx, Box, Flex, Text, Spinner, Button, Close } from 'theme-ui';
import { Icon } from '@makerdao/dai-ui-icons';

import { useWeb3React, Web3ReactProvider } from '@web3-react/core';

import { getLibrary, connectors, ConnectorName } from '../../lib/maker/web3react';
import { syncMakerAccount } from '../../lib/maker/web3react/hooks';
import { formatAddress } from '../../lib/utils';
import useTransactionStore from '../../stores/transactions';
import { DialogOverlay, DialogContent } from '@reach/dialog';
import { useBreakpointIndex } from '@theme-ui/match-media';
import AccountBox from './AccountBox';
import TransactionBox from './TransactionBox';
import AccountIcon from './AccountIcon';
import VotingWeight from './VotingWeight';

const WrappedAccountSelect = (props): JSX.Element => (
  <Web3ReactProvider getLibrary={getLibrary}>
    <AccountSelect {...props} />
  </Web3ReactProvider>
);

const AccountSelect = props => {
  const web3ReactContext = useWeb3React();
  const { library, account, activate, connector } = web3ReactContext;

  // FIXME there must be a more direct way to get web3-react & maker to talk to each other
  syncMakerAccount(library, account);
  const [pending, txs] = useTransactionStore(state => [
    state.transactions.findIndex(tx => tx.status === 'pending') > -1,
    state.transactions
  ]);

  const [showDialog, setShowDialog] = React.useState(false);
  const [accountName, setAccountName] = React.useState<ConnectorName>();
  const [changeWallet, setChangeWallet] = React.useState(false);
  const open = () => setShowDialog(true);
  const close = () => setShowDialog(false);
  const bpi = useBreakpointIndex();

  const walletOptions = connectors.map(([name, connector]) => (
    <Flex
      sx={{
        cursor: 'pointer',
        width: '100%',
        p: 3,
        border: '1px solid',
        borderColor: 'secondaryMuted',
        borderRadius: 'medium',
        mb: 2,
        flexDirection: 'row',
        alignItems: 'center'
      }}
      key={name}
      onClick={() => {
        activate(connector).then(() => {
          setAccountName(name);
          setChangeWallet(false);
        });
      }}
    >
      <Icon name={name} />
      <Text sx={{ ml: 3 }}>{name}</Text>
    </Flex>
  ));

  return (
    <Box>
      <Button
        aria-label="Connect wallet"
        sx={{
          variant: 'buttons.card',
          borderRadius: 'round',
          color: 'textSecondary',
          height: '40px',
          px: [2, 3],
          py: 0,
          alignSelf: 'flex-end',
          '&:hover': {
            color: 'text',
            borderColor: 'onSecondary',
            backgroundColor: 'white'
          }
        }}
        {...props}
        onClick={open}
      >
        {account ? (
          pending ? (
            <Flex sx={{ display: 'inline-flex' }}>
              <Spinner
                size={16}
                sx={{
                  color: 'mutedOrange',
                  alignSelf: 'center',
                  mr: 2
                }}
              />
              <Text sx={{ color: 'mutedOrange' }}>TX Pending</Text>
            </Flex>
          ) : (
            <Flex sx={{ alignItems: 'center', mr: 2 }}>
              <AccountIcon account={account} sx={{ mr: 2 }} />
              <Text sx={{ fontFamily: 'body' }}>{formatAddress(account)}</Text>
            </Flex>
          )
        ) : (
          <Box mx={2}>Connect wallet</Box>
        )}
      </Button>
      <DialogOverlay isOpen={showDialog} onDismiss={close}>
        {changeWallet ? (
          <DialogContent
            aria-label="Change Wallet"
            sx={
              bpi === 0
                ? { variant: 'dialog.mobile' }
                : { boxShadow: '0px 10px 50px hsla(0, 0%, 0%, 0.33)', width: '450px', borderRadius: '8px' }
            }
          >
            <Flex sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Button variant="textual" color="primary" onClick={() => setChangeWallet(false)}>
                Back
              </Button>
              <Close aria-label="close" sx={{ height: '18px', width: '18px', p: 0 }} onClick={close} />
            </Flex>
            {walletOptions}
          </DialogContent>
        ) : (
          <DialogContent
            aria-label="Wallet Info"
            sx={
              bpi === 0
                ? { variant: 'dialog.mobile' }
                : { boxShadow: '0px 10px 50px hsla(0, 0%, 0%, 0.33)', width: '450px', borderRadius: '8px' }
            }
          >
            <Flex sx={{ flexDirection: 'row', justifyContent: 'space-between', mb: 3 }}>
              <Text variant="microHeading" color="onBackgroundAlt">
                {account ? 'Account' : 'Select a Wallet'}
              </Text>
              <Close
                aria-label="close"
                sx={{ height: 4, width: 4, p: 0, position: 'relative', top: '-4px', left: '8px' }}
                onClick={close}
              />
            </Flex>
            {!account && <Flex sx={{ flexDirection: 'column' }}>{walletOptions}</Flex>}
            {account && connector && (
              <AccountBox
                {...{ account, accountName, connector }}
                // This needs to be the change function for the wallet select dropdown
                change={() => setChangeWallet(true)}
              />
            )}
            {account && <VotingWeight sx={{ borderBottom: '1px solid secondaryMuted', py: 2 }} />}
            {account && txs?.length > 0 && <TransactionBox txs={txs} />}
          </DialogContent>
        )}
      </DialogOverlay>
    </Box>
  );
};

export default WrappedAccountSelect;
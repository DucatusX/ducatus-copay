export const JWAN_STAKE_ABI = [
  {
    type: 'constructor',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: '_jwan', internalType: 'address' },
      { type: 'address', name: '_owner', internalType: 'address' }
    ]
  },
  {
    type: 'event',
    name: 'Claim',
    inputs: [
      {
        type: 'address',
        name: 'user',
        internalType: 'address',
        indexed: false
      },
      {
        type: 'uint256',
        name: 'amount',
        internalType: 'uint256',
        indexed: false
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Deposit',
    inputs: [
      {
        type: 'address',
        name: 'user',
        internalType: 'address',
        indexed: false
      },
      {
        type: 'uint256',
        name: 'amount',
        internalType: 'uint256',
        indexed: false
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Finish',
    inputs: [
      { type: 'uint256', name: 'time', internalType: 'uint256', indexed: false }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'OwnershipTransferred',
    inputs: [
      {
        type: 'address',
        name: 'previousOwner',
        internalType: 'address',
        indexed: true
      },
      {
        type: 'address',
        name: 'newOwner',
        internalType: 'address',
        indexed: true
      }
    ],
    anonymous: false
  },
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      {
        type: 'address',
        name: 'user',
        internalType: 'address',
        indexed: false
      },
      {
        type: 'uint256',
        name: 'amount',
        internalType: 'uint256',
        indexed: false
      }
    ],
    anonymous: false
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'address', name: '', internalType: 'contract IERC20' }],
    name: 'JWAN',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'PERCENT_BASE',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'REWARD',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'YEAR',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [],
    name: 'claim',
    inputs: [{ type: 'uint256', name: 'index', internalType: 'uint256' }]
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [],
    name: 'claimBatch',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [],
    name: 'deposit',
    inputs: [{ type: 'uint256', name: 'amount', internalType: 'uint256' }]
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'endTime',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [],
    name: 'finishStaking',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'indexesForUser',
    inputs: [{ type: 'address', name: '', internalType: 'address' }]
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'address', name: '', internalType: 'address' }],
    name: 'owner',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [],
    name: 'renounceOwnership',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      { type: 'uint256', name: 'amount', internalType: 'uint256' },
      { type: 'uint256', name: 'period', internalType: 'uint256' }
    ],
    name: 'rewardForStake',
    inputs: [
      { type: 'address', name: 'user', internalType: 'address' },
      { type: 'uint256', name: 'index', internalType: 'uint256' }
    ]
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256', name: 'amount', internalType: 'uint256' }],
    name: 'rewardForStakeBatch',
    inputs: [{ type: 'address', name: 'user', internalType: 'address' }]
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [{ type: 'uint256', name: '', internalType: 'uint256' }],
    name: 'totalStaked',
    inputs: []
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [],
    name: 'transferOwnership',
    inputs: [{ type: 'address', name: 'newOwner', internalType: 'address' }]
  },
  {
    type: 'function',
    stateMutability: 'view',
    outputs: [
      { type: 'uint256', name: 'amount', internalType: 'uint256' },
      { type: 'uint256', name: 'enteredAt', internalType: 'uint256' },
      { type: 'uint256', name: 'gotInYears', internalType: 'uint256' }
    ],
    name: 'userDeposit',
    inputs: [
      { type: 'address', name: '', internalType: 'address' },
      { type: 'uint256', name: '', internalType: 'uint256' }
    ]
  },
  {
    type: 'function',
    stateMutability: 'nonpayable',
    outputs: [],
    name: 'withdraw',
    inputs: [{ type: 'uint256', name: 'index', internalType: 'uint256' }]
  }
];

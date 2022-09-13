import env from '../../environments';

export class ContractAddress {

  private config = {
    prod: {
      jwanStakeAddress: '0x0d669902B1E2Dc2E7b229D5d9b3D15c3D719d3c1', 
      jwanTokenAddress: '0xFCb965D9Da10A15eb87B3Da539383997ce6fA597',
    },
    develop: {
      jwanStakeAddress: '0xE303dD7146E67D3Bd438e54971ebd9076908e7d5',
      jwanTokenAddress: '0xFCb965D9Da10A15eb87B3Da539383997ce6fA597',
    }
  };

  public getAddresses() {
    // if you want build dev:
    // # npm run build:desktop
    // if you want build prod: 
    // # npm run build:desktop-release
    const mode: string = env && env.name;

    if ( mode === 'production' ) {
      return this.config.prod;
    } else {
      return this.config.develop;
    }
  }
}
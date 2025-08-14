import { useEffect, useState } from 'react';
import { useSetupStore } from '@/stores/setupStore';
import { poseidon2 } from 'poseidon-lite';
import BigNumber from 'bignumber.js';

function deriveKeyHex(seed: string, index: number): string {
  // Hash seed + index with Poseidon-lite, get hex string
  const input = [
    BigNumber(seed).plus(index).toFixed(),
    '0'
  ];
  const hash = poseidon2([BigNumber(seed).plus(index).toFixed(), '0']);
  let hex = hash.toString(16);
  // Pad to even length
  if (hex.length % 2 !== 0) hex = '0' + hex;
  // Pad to at least 64 chars for splitting
  hex = hex.padStart(64, '0');
  return hex;
}

export function ShowNullifiersStep() {
  const { mnemonic, privateKey } = useSetupStore();
  const [pairs, setPairs] = useState<{ nullifier: string, secret: string }[]>([]);

  useEffect(() => {
    const seed = privateKey || (mnemonic ? mnemonic.join('') : '');
    if (!seed) return;
    const generated: { nullifier: string, secret: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const keyHex = deriveKeyHex(seed, i);
      const half = Math.floor(keyHex.length / 2);
      const nullifier = keyHex.slice(0, half);
      const secret = keyHex.slice(half);
      generated.push({ nullifier, secret });
    }
    setPairs(generated);
  }, [mnemonic, privateKey]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-8">
      <h2 className="text-lg font-bold mb-4">Your Deterministic Nullifiers &amp; Secrets</h2>
      <div className="space-y-4 w-full max-w-md">
        {pairs.map((pair, idx) => (
          <div key={idx} className="rounded-lg p-4">
            <div className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Pair {idx + 1}</div>
            <div className="text-xs break-all"><span className="font-bold">Nullifier:</span> {pair.nullifier}</div>
            <div className="text-xs break-all"><span className="font-bold">Secret:</span> {pair.secret}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-sm text-gray-500 text-center">
        These values are SNARK-compatible and can be regenerated from your key.<br />
        Backup your mnemonic/private key securely.
      </div>
    </div>
  );
}

import { useState, useCallback, useMemo } from "react";
import { createHmac, createHash } from "crypto";

import "./styles.css";

// Hash for ethereum block #14211322 (https://twitter.com/venobet/status/1493594368640528388)
const CLIENT_SEED =
  "0x3b2d4aa9bdfea91f09642ea20c65383b71bf785bd922a96fd7e70cbac4ee58d3";

function saltHash(hash) {
  return createHmac("sha256", hash).update(CLIENT_SEED).digest("hex");
}

function generateHash(seed) {
  return createHash("sha256").update(seed).digest("hex");
}

function shouldInstaCrash(hash, mod) {
  let val = 0;

  const o = hash.length % 4;
  for (let i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
    val = ((val << 16) + parseInt(hash.substring(i, i + 4), 16)) % mod;
  }

  return val === 0;
}

function getCrashPointFromSeed(serverSeed) {
  const hash = saltHash(serverSeed);

  // One out of 20 rounds would crash at 1.00x
  if (shouldInstaCrash(hash, 20)) {
    return 1;
  }

  const h = parseInt(hash.slice(0, 52 / 4), 16);
  const e = 2 ** 52;

  return Math.floor((100 * e - h) / (e - h)) / 100.0;
}

function formatRound(seed) {
  const hash = saltHash(seed);
  const multiplier = getCrashPointFromSeed(seed);

  return { seed, multiplier, hash };
}

function getPreviousRounds(seed) {
  const previousRounds = [];
  let newHash = generateHash(seed);

  for (let i = 0; i < 100; i++) {
    const formattedRound = formatRound(newHash);
    previousRounds.push(formattedRound);
    newHash = generateHash(newHash);
  }

  return previousRounds;
}

export default function App() {
  const [inputtedServerSeed, setInputtedServerSeed] = useState("");

  const handleInputServerSeed = useCallback((event) => {
    setInputtedServerSeed(event.target.value);
  }, []);

  const formattedRound = useMemo(() => {
    if (!inputtedServerSeed) {
      return undefined;
    }

    return formatRound(inputtedServerSeed);
  }, [inputtedServerSeed]);

  const previousRounds = useMemo(() => {
    if (!inputtedServerSeed) {
      return [];
    }

    return getPreviousRounds(inputtedServerSeed);
  }, [inputtedServerSeed]);

  return (
    <div className="App">
      <h2>Enter the server seed of your round</h2>
      <p>(You can find it on your transaction history)</p>

      <input value={inputtedServerSeed} onChange={handleInputServerSeed} />

      {formattedRound && (
        <>
          <h3>Inputted round</h3>

          <table>
            <thead>
              <tr>
                <th>Crash point</th>
                <th>Seed</th>
                <th>Hash (hmac with client seed)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formattedRound.multiplier}</td>
                <td>{formattedRound.seed}</td>
                <td>{formattedRound.hash}</td>
              </tr>
            </tbody>
          </table>

          <h3>Previous 100 rounds</h3>

          <table>
            <thead>
              <tr>
                <th>Crash point</th>
                <th>Seed</th>
                <th>Hash (hmac with client seed)</th>
              </tr>
            </thead>
            <tbody>
              {previousRounds.map((previousRound) => (
                <tr>
                  <td>{previousRound.multiplier}</td>
                  <td>{previousRound.seed}</td>
                  <td>{previousRound.hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

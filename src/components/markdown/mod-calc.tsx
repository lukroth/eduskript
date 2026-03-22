'use client'

import { useEffect, useState } from 'react'

/**
 * Formula presets for different cryptographic contexts.
 * Each defines: base^exp mod mod = result with variable names and labels.
 */
const FORMULAS: Record<string, { base: string; exp: string; mod: string; result: string; baseLabel: string; expLabel: string; modLabel: string }> = {
  // Discrete Log Problem / Diffie-Hellman (default)
  dlog: { base: 'g', exp: 'k', mod: 'p', result: 'K', baseLabel: 'Basis g', expLabel: 'Exponent k', modLabel: 'Modulus p' },
  // RSA encryption: m^e mod n = c
  'rsa-enc': { base: 'm', exp: 'e', mod: 'n', result: 'c', baseLabel: 'Nachricht m', expLabel: 'Public Exponent e', modLabel: 'Modulus n' },
  // RSA decryption: c^d mod n = m
  'rsa-dec': { base: 'c', exp: 'd', mod: 'n', result: 'm', baseLabel: 'Ciphertext c', expLabel: 'Private Exponent d', modLabel: 'Modulus n' },
}

interface ModCalcProps {
  formula?: string
}

/**
 * ModCalc - Power Mod Calculator
 * Calculates base^exp mod mod = result using BigInt for large number support.
 * Color-coded inputs: base (orange), exponent (green), modulus (purple), result (dark green)
 *
 * Usage:
 *   <modcalc />                    — g^k mod p = K (default, DLP)
 *   <modcalc formula="rsa-enc" />  — m^e mod n = c
 *   <modcalc formula="rsa-dec" />  — c^d mod n = m
 */
export function ModCalc({ formula = 'dlog' }: ModCalcProps) {
  const f = FORMULAS[formula] || FORMULAS.dlog

  const [base, setBase] = useState(5)
  const [exponent, setExponent] = useState(3)
  const [modulus, setModulus] = useState(23)
  const [result, setResult] = useState(10)
  const [nonsense, setNonsense] = useState(false)

  useEffect(() => {
    if (!isNaN(base) && !isNaN(exponent) && modulus && modulus !== 0) {
      try {
        const b = BigInt(base)
        const e = BigInt(exponent)
        const m = BigInt(modulus)
        const res = b ** e % m
        // eslint-disable-next-line react-hooks/set-state-in-effect -- derived state from inputs
        setResult(Number(res))

        setNonsense(false)
      } catch {

        setNonsense(true)
      }
    } else {

      setNonsense(true)
    }
  }, [base, exponent, modulus])

  return (
    <div className="max-w-[400px] mx-auto my-8 p-5 bg-neutral-100 dark:bg-neutral-800 rounded-xl shadow-lg">
      <h2 className="text-center text-xl font-extrabold mb-5">
        Power Mod Calculator
      </h2>

      {/* Formula with variable names */}
      <div className="text-center text-2xl my-4">
        <span className="text-orange-500">{f.base}</span>
        <sup className="text-green-500">{f.exp}</sup> mod{' '}
        <span className="text-violet-500">{f.mod}</span> ={' '}
        <span className="text-emerald-700 dark:text-emerald-500">{f.result}</span>
      </div>

      {/* Live calculation */}
      <div className="relative">
        <div className={`text-center text-xl sm:text-2xl my-4 transition-opacity ${nonsense ? 'opacity-10' : ''}`}>
          <span className="text-orange-500">
            {isNaN(base) ? f.base : base}
          </span>
          <sup className="text-green-500">
            {isNaN(exponent) ? f.exp : exponent}
          </sup>{' '}
          mod{' '}
          <span className="text-violet-500">
            {isNaN(modulus) ? f.mod : modulus}
          </span>{' '}
          = <span className="text-emerald-700 dark:text-emerald-500 font-bold">{result}</span>
        </div>

        {nonsense && (
          <div className="absolute top-2 w-full text-center font-bold text-red-500 hover:text-red-600">
            Let&apos;s try not to break maths 😬👍
          </div>
        )}
      </div>

      {/* Inputs */}
      <div className="space-y-4 mt-6">
        <div>
          <label className="block mb-1 text-orange-500 font-medium">{f.baseLabel}</label>
          <input
            type="number"
            value={base}
            onChange={e => setBase(parseInt(e.target.value))}
            className="w-full p-2.5 border border-border rounded bg-background text-foreground text-base"
          />
        </div>
        <div>
          <label className="block mb-1 text-green-500 font-medium">{f.expLabel}</label>
          <input
            type="number"
            value={exponent}
            onChange={e => setExponent(parseInt(e.target.value))}
            className="w-full p-2.5 border border-border rounded bg-background text-foreground text-base"
          />
        </div>
        <div>
          <label className="block mb-1 text-violet-500 font-medium">{f.modLabel}</label>
          <input
            type="number"
            value={modulus}
            onChange={e => setModulus(parseInt(e.target.value))}
            className="w-full p-2.5 border border-border rounded bg-background text-foreground text-base"
          />
        </div>
      </div>
    </div>
  )
}

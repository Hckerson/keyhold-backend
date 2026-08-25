import { Prisma } from 'generated/prisma/client';

type MaybeDecimal = Prisma.Decimal | null | undefined;

/**
 * Monetary columns are `Decimal(14, 2)`, so Prisma hands them back as
 * `Prisma.Decimal` rather than `number`. Two things follow from that:
 *
 *  - Arithmetic must stay in Decimal. `a + b` on two Decimals concatenates
 *    their string forms, and `>=` compares them lexicographically, so a raw
 *    JavaScript operator on money is always a bug.
 *  - `Decimal` serialises to JSON as a *string*, so anything crossing the API
 *    boundary has to be converted deliberately or the response shape changes.
 *
 * These helpers are the sanctioned conversion points. Sum in Decimal, convert
 * once, at the edge.
 */

/** For display, ratios and aggregate reporting. Nullish becomes 0. */
export const toNumber = (value: MaybeDecimal): number =>
    value == null ? 0 : value.toNumber();

/** For nullable response fields, where absent and zero mean different things. */
export const toNullableNumber = (value: MaybeDecimal): number | null =>
    value == null ? null : value.toNumber();

/** Exact sum. Stays in Decimal so the caller decides where precision is lost. */
export const sumDecimal = (values: MaybeDecimal[]): Prisma.Decimal =>
    values.reduce<Prisma.Decimal>(
        (total, value) => (value == null ? total : total.add(value)),
        new Prisma.Decimal(0),
    );

/**
 * Major units to whole minor units (kobo, cents) for a payment provider.
 * Providers charge in integers; this is the only place that conversion happens.
 */
export const toMinorUnits = (value: Prisma.Decimal): number =>
    value.mul(100).toDecimalPlaces(0).toNumber();

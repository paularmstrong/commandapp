// flow-typed signature: fa522fe39c9961c2732220ba26deb775
// flow-typed version: <<STUB>>/random-seed_v0.3.0/flow_v0.136.0

/**
 * This is an autogenerated libdef stub for:
 *
 *   'random-seed'
 *
 * Fill this stub out by replacing all the `any` types.
 *
 * Once filled out, we encourage you to share your work with the
 * community by sending a pull request to:
 * https://github.com/flowtype/flow-typed
 */

declare module 'random-seed' {
  declare type RandomSeed = {|
    (range: number): number,
    range(range: number): number,
    random(): number,
    floatBetween(min: number, max: number): number,
    intBetween(min: number, max: number): number,

    string(count: number): string,
    seed(seed: string): void,

    cleanString(inStr: string): string,
    hashString(inStr: string): string,

    addEntropy(...args: any[]): void,
    initState(): void,

    done(): void,

    create(seed?: string): RandomSeed,
  |};

   declare export default RandomSeed;
}

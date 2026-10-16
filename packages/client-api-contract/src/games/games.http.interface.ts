import { Schema } from "effect";
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/unstable/httpapi";

const Name = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(200));
export const Identity = Schema.Struct({ firstName: Name, lastName: Name });
const Status = Schema.Literals(["not-started", "in-progress", "completed"]);
const Group = Schema.Struct({ id: Schema.String, title: Schema.String, words: Schema.Array(Schema.String) });
const Elapsed = Schema.NullOr(Schema.Number);
export const GameState = Schema.Struct({
  puzzleId: Schema.String, joined: Schema.Boolean, revision: Schema.Int,
  wordle: Schema.Struct({ elapsedMs: Elapsed, status: Status, score: Schema.Int, guesses: Schema.Array(Schema.Struct({ word: Schema.String, tiles: Schema.Array(Schema.Literals(["correct", "present", "absent"])) })), answer: Schema.NullOr(Schema.String) }),
  connections: Schema.Struct({ elapsedMs: Elapsed, status: Status, score: Schema.Int, mistakes: Schema.Int, words: Schema.Array(Schema.String), solved: Schema.Array(Group), reveal: Schema.Array(Group) }),
  leaderboard: Schema.Array(Schema.Struct({ elapsedMs: Elapsed, rank: Schema.Int, name: Schema.String, total: Schema.Int, wordle: Schema.Int, connections: Schema.Int, status: Status })),
});
export type GameState = typeof GameState.Type;
export const Submit = Schema.Struct({ ...Identity.fields, expectedRevision: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)), game: Schema.Literals(["wordle", "connections"]), words: Schema.Array(Schema.String.check(Schema.isMaxLength(40))).check(Schema.isMaxLength(4)) });
export type Submit = typeof Submit.Type;
const errors = [HttpApiError.ForbiddenNoContent, HttpApiError.BadRequestNoContent, HttpApiError.ConflictNoContent, HttpApiError.InternalServerErrorNoContent] as const;
export const GamesHttpGroup = HttpApiGroup.make("games")
  .add(HttpApiEndpoint.post("state", "/games/state", { payload: Identity, success: GameState, error: errors }))
  .add(HttpApiEndpoint.post("join", "/games/join", { payload: Identity, success: GameState, error: errors }))
  .add(HttpApiEndpoint.post("start", "/games/start", { payload: Submit, success: GameState, error: errors }))
  .add(HttpApiEndpoint.post("submit", "/games/submit", { payload: Submit, success: GameState, error: errors }));
export const GamesHttpApi = HttpApi.make("GamesHttpApi").add(GamesHttpGroup);

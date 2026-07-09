import type { MiddlewareHandler } from "hono";
import { every } from "hono/combine";
import type {
	Env,
	ExtractHandlerResponse,
	H,
	HandlerResponse,
	Input,
	IntersectNonAnyTypes,
} from "hono/types";

/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any -- mirrors Hono's own MiddlewareHandler/HandlerInterface generic defaults */
export function createHandler<
	E extends Env = Env,
	P extends string = string,
	I extends Input = {},
	R extends HandlerResponse<any> = any,
>(middlewareA: MiddlewareHandler<E, P, I, R>): MiddlewareHandler<E, P, I, R>;
export function createHandler<
	P extends string = string,
	I extends Input = {},
	I2 extends Input = I,
	R extends HandlerResponse<any> = any,
	E extends Env = Env,
	E2 extends Env = E,
	E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
	M1 extends H<E2, P, I> = H<E2, P, I>,
>(
	middlewareA: H<E2, P, I> & M1,
	middlewareB: MiddlewareHandler<E3, P, I2, R>
): MiddlewareHandler<
	IntersectNonAnyTypes<[E, E2, E3]>,
	P,
	I2,
	R | ExtractHandlerResponse<M1>
>;
export function createHandler<
	P extends string = string,
	I extends Input = {},
	I2 extends Input = I,
	I3 extends Input = I & I2,
	R extends HandlerResponse<any> = any,
	E extends Env = Env,
	E2 extends Env = E,
	E3 extends Env = IntersectNonAnyTypes<[E, E2]>,
	E4 extends Env = IntersectNonAnyTypes<[E, E2, E3]>,
	M1 extends H<E2, P, I> = H<E2, P, I>,
	M2 extends H<E3, P, I2> = H<E3, P, I2>,
>(
	middlewareA: H<E2, P, I> & M1,
	middlewareB: H<E3, P, I2> & M2,
	middlewareC: MiddlewareHandler<E4, P, I3, R>
): MiddlewareHandler<
	IntersectNonAnyTypes<[E, E2, E3, E4]>,
	P,
	I3,
	R | ExtractHandlerResponse<M1> | ExtractHandlerResponse<M2>
>;
export function createHandler(...middleware: MiddlewareHandler[]) {
	return every(...middleware) as MiddlewareHandler;
}
/* eslint-enable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */

type PromiseType<T extends Promise<any>> = T extends Promise<infer P> ? P : never

type KeyOfUnion<T> = T extends T ? keyof T : never

type DistributiveOmit<T, K extends KeyOfUnion<T>> = T extends T ? Omit<T, K> : never

type Nullable<T, D extends keyof T> = { [K in keyof T]: K extends D ? T[K] | null : T[K] }

type Undefineder<T> = {
	[P in keyof T]?: T[P]
}

type AddParameters<TFunction extends (...args: any) => any, TParameters extends [...args: any]> = (
	...args: [...Parameters<TFunction>, ...TParameters]
) => ReturnType<TFunction>

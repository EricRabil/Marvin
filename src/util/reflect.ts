export function has<T, P extends PropertyKey>(target: T, property: P): target is T &{ [K in P]: unknown } {
	// The `in` operator throws a `TypeError` for non-object values.
	return property in target;
}
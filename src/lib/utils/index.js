/**
 * @reference https://stackoverflow.com/questions/40291987/javascript-deep-clone-object-with-circular-references
 */
export default function clone (obj, hash = new WeakMap()) {
  // Do not try to clone primitives or functions
  let result
  if (Object(obj) !== obj || obj instanceof Function) return obj
  if (hash.has(obj)) return hash.get(obj) // Cyclic reference
  try { // Try to run constructor (without arguments, as we don't know them)
    result = new obj.constructor()
  } catch (e) { // Constructor failed, create object without running the constructor
    result = Object.create(Object.getPrototypeOf(obj))
  }
  // Optional: support for some standard constructors (extend as desired)
  if (obj instanceof Map) Array.from(obj, ([key, val]) => result.set(clone(key, hash), clone(val, hash)))
  else if (obj instanceof Set) Array.from(obj, (key) => result.add(clone(key, hash)))
  // Register in hash
  hash.set(obj, result)
  // Clone and assign enumerable own properties recursively
  return Object.assign(
    result,
    ...Object.entries(obj).map(([k, v]) => ({
      [k]: clone(v, hash)
    }))
  )
}

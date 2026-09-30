@tool
class_name Anatomy
extends RefCounted
## Body-part shapes for every character, as dense quad-grid wireframes.
## Each part is in its joint's local space (limbs hang down -Y from their joint, the body faces +Z).
## Profile keys are [height, half-width, half-depth, forward offset], smoothed into rings.
## Bulges are [angle, amount, width, y0, y1]: angle 0 is the front, PI the back, -PI/2 the body's right.
## Negative amounts carve in (eye sockets, the sternum groove).
## Meshes are built once and shared by every character; each character colours them with its own material.

## Grid density. 2.0 is about four times the lines of 1.0.
const DETAIL := 1.6

static var _cache := {}
static var _occ_cache := {}
static var _occ_mat: StandardMaterial3D


## Shared line mesh for a named part (no material; set material_override on the instance).
static func mesh(part: String) -> ArrayMesh:
	if not _cache.has(part):
		var pts := PackedVector3Array()
		for sp in _build_part(part):
			pts.append_array(Wire.loft(sp["rows"], sp["radial"], sp["b"], sp["xf"]))
		_cache[part] = Wire.lines_mesh(pts, null)
	return _cache[part]


## Matching solid shell, slightly inside the grid, that hides the far side of the body.
static func occluder(part: String) -> ArrayMesh:
	if not _occ_cache.has(part):
		var tris := PackedVector3Array()
		for sp in _build_part(part):
			tris.append_array(Wire.loft_tris(sp["rows"], sp["radial"], sp["b"], sp["xf"], 0.96))
		var am := ArrayMesh.new()
		var arr := []
		arr.resize(Mesh.ARRAY_MAX)
		arr[Mesh.ARRAY_VERTEX] = tris
		am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		_occ_cache[part] = am
	return _occ_cache[part]


static func occluder_mat() -> StandardMaterial3D:
	if _occ_mat == null:
		_occ_mat = StandardMaterial3D.new()
		_occ_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_occ_mat.albedo_color = Color("0a0c13")
		_occ_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return _occ_mat


static func _build_part(part: String) -> Array:
	match part:
		"torso": return torso()
		"pelvis": return pelvis()
		"neck": return neck()
		"head": return head()
		"upper_arm": return upper_arm()
		"forearm": return forearm()
		"hand": return hand()
		"thigh": return thigh()
		"shin": return shin()
		"foot": return foot()
		"hakama": return hakama()
		"chest_armor": return chest_armor()
	push_error("Anatomy: unknown part " + part)
	return []


static func _n(x: float) -> int:
	return maxi(3, int(round(x * DETAIL)))


## one lofted surface, kept as a spec so it can be drawn both as grid lines and as a hidden shell
static func _part(keys: Array, rings: float, radial: float, bulges: Array = [], xf: Transform3D = Transform3D.IDENTITY) -> Array:
	return [{"rows": Wire.sample(keys, _n(rings)), "radial": _n(radial), "b": bulges, "xf": xf}]


static func _mirror(b: Array) -> Array:
	var out := []
	for x in b:
		out.append(x)
		if absf(x[0]) > 0.01 and absf(absf(x[0]) - PI) > 0.01:
			out.append([-x[0], x[1], x[2], x[3], x[4]])
	return out


# ------------------------------------------------------------------ core
## chest to neck base; attached to the torso joint (hip height)
static func torso() -> Array:
	var keys := [[-0.02, 0.145, 0.098, 0.0], [0.06, 0.134, 0.09, 0.0], [0.14, 0.138, 0.093, 0.0], [0.22, 0.152, 0.1, 0.004],
		[0.3, 0.172, 0.108, 0.008], [0.37, 0.186, 0.113, 0.012], [0.43, 0.196, 0.11, 0.008], [0.49, 0.205, 0.1, 0.0],
		[0.54, 0.168, 0.086, -0.005], [0.58, 0.09, 0.066, 0.0], [0.61, 0.064, 0.058, 0.0]]
	var b := _mirror([
		[0.52, 0.11, 0.33, 0.29, 0.45],  # pectorals
		[0.0, -0.035, 0.1, 0.24, 0.46],  # sternum groove
		[0.2, 0.05, 0.16, 0.0, 0.08], [0.2, 0.05, 0.16, 0.08, 0.16], [0.2, 0.05, 0.16, 0.16, 0.25],  # abdominal blocks
		[1.1, 0.05, 0.3, 0.02, 0.26],  # obliques
		[0.95, 0.06, 0.28, 0.49, 0.57],  # collarbones
		[PI - 0.65, 0.07, 0.38, 0.26, 0.5],  # shoulder blades
		[PI - 1.6, 0.05, 0.35, 0.18, 0.44],  # lats
		[PI, -0.03, 0.12, 0.05, 0.5],  # spine groove
		[PI - 0.4, 0.07, 0.6, 0.5, 0.6],  # trapezius
	])
	return _part(keys, 17, 24, b)


## hips and seat; attached to the hips joint
static func pelvis() -> Array:
	var keys := [[-0.17, 0.118, 0.084, 0.0], [-0.12, 0.146, 0.098, 0.0], [-0.06, 0.158, 0.104, -0.004], [0.0, 0.156, 0.102, -0.004], [0.04, 0.148, 0.099, 0.0]]
	var b := _mirror([[PI - 0.5, 0.11, 0.45, -0.17, 0.0], [1.0, 0.05, 0.3, -0.05, 0.04]])  # glutes, hip bones
	return _part(keys, 7, 24, b)


static func neck() -> Array:
	var b := _mirror([[0.55, 0.08, 0.25, -0.05, 0.04], [0.0, 0.07, 0.15, -0.03, 0.02]])  # neck muscles, throat
	return _part([[-0.05, 0.06, 0.058, 0.0], [-0.01, 0.054, 0.053, 0.002], [0.03, 0.051, 0.05, 0.004], [0.06, 0.05, 0.05, 0.004]], 5, 14, b)


static func head() -> Array:
	var keys := [[0.028, 0.035, 0.04, 0.02], [0.045, 0.058, 0.064, 0.016], [0.07, 0.072, 0.08, 0.01], [0.1, 0.078, 0.09, 0.006],
		[0.13, 0.083, 0.098, 0.002], [0.16, 0.087, 0.102, 0.0], [0.19, 0.089, 0.103, -0.002], [0.22, 0.087, 0.099, -0.005],
		[0.25, 0.076, 0.087, -0.006], [0.275, 0.054, 0.063, -0.006], [0.292, 0.02, 0.024, -0.006], [0.297, 0.0, 0.0, -0.006]]
	var b := _mirror([
		[0.0, 0.24, 0.14, 0.105, 0.165],  # nose
		[0.0, 0.07, 0.22, 0.08, 0.105],  # lips
		[0.0, 0.1, 0.3, 0.025, 0.07],  # chin
		[0.38, -0.09, 0.17, 0.15, 0.185],  # eye sockets
		[0.3, 0.05, 0.5, 0.18, 0.205],  # brow ridge
		[0.72, 0.06, 0.28, 0.115, 0.16],  # cheekbones
		[1.2, 0.05, 0.3, 0.04, 0.12],  # jaw
		[PI / 2, 0.14, 0.17, 0.115, 0.185],  # ears
	])
	return _part(keys, 16, 22, b)


# ------------------------------------------------------------------ arms
static func upper_arm() -> Array:
	var keys := [[0.045, 0.048, 0.05, 0.0], [0.0, 0.066, 0.064, 0.0], [-0.05, 0.062, 0.058, 0.0], [-0.11, 0.055, 0.054, 0.0],
		[-0.18, 0.05, 0.051, 0.0], [-0.25, 0.044, 0.045, 0.0], [-0.3, 0.041, 0.042, 0.0]]
	var b := _mirror([[PI / 2, 0.12, 0.7, -0.09, 0.05],  # deltoid
		[0.0, 0.13, 0.45, -0.22, -0.06],  # biceps
		[PI, 0.1, 0.5, -0.24, -0.04]])  # triceps
	return _part(keys, 11, 14, b)


static func forearm() -> Array:
	var keys := [[0.01, 0.041, 0.04, 0.0], [-0.04, 0.047, 0.043, 0.0], [-0.09, 0.044, 0.039, 0.0], [-0.15, 0.036, 0.031, 0.0],
		[-0.21, 0.029, 0.024, 0.0], [-0.27, 0.027, 0.02, 0.0]]
	var b := _mirror([[0.9, 0.1, 0.5, -0.12, 0.0], [PI - 0.6, 0.06, 0.5, -0.14, 0.0], [PI / 2, 0.05, 0.3, -0.03, 0.01]])
	return _part(keys, 10, 14, b)


## palm (facing the body) with four fingers and a thumb
static func hand() -> Array:
	var out := _part([[0.03, 0.016, 0.024, 0.0], [0.0, 0.017, 0.032, 0.0], [-0.04, 0.016, 0.04, 0.0], [-0.075, 0.014, 0.041, 0.0], [-0.09, 0.012, 0.038, 0.0]], 6, 12)
	var fz := [-0.029, -0.01, 0.009, 0.028]
	var fl := [0.062, 0.078, 0.082, 0.072]
	for i in 4:
		var l: float = fl[i]
		var keys := [[0.0, 0.0085, 0.009, 0.0], [-l * 0.4, 0.0075, 0.008, 0.0], [-l * 0.75, 0.0065, 0.007, 0.0], [-l, 0.003, 0.004, 0.0]]
		# fingers curl slightly toward the palm, like they are about to close on a grip
		var xf := Transform3D(Basis(Vector3.BACK, -0.18), Vector3(0, -0.088, fz[i]))
		out.append_array(_part(keys, 4, 6, [], xf))
	var thumb := [[0.0, 0.011, 0.011, 0.0], [-0.025, 0.0095, 0.0095, 0.0], [-0.045, 0.008, 0.008, 0.0], [-0.06, 0.004, 0.004, 0.0]]
	out.append_array(_part(thumb, 4, 6, [], Transform3D(Basis(Vector3.RIGHT, -0.7) * Basis(Vector3.BACK, -0.4), Vector3(-0.012, -0.02, 0.035))))
	return out


# ------------------------------------------------------------------ legs
static func thigh() -> Array:
	var keys := [[0.035, 0.078, 0.08, 0.0], [-0.02, 0.09, 0.09, 0.002], [-0.1, 0.086, 0.086, 0.004], [-0.18, 0.078, 0.08, 0.006],
		[-0.26, 0.069, 0.07, 0.004], [-0.34, 0.058, 0.06, 0.002], [-0.4, 0.052, 0.056, 0.004], [-0.44, 0.05, 0.054, 0.006]]
	var b := _mirror([[0.0, 0.11, 0.55, -0.32, -0.04],  # quadriceps
		[0.0, 0.14, 0.4, -0.45, -0.37],  # kneecap
		[0.9, 0.07, 0.4, -0.38, -0.2],  # vastus
		[PI, 0.08, 0.6, -0.34, -0.02]])  # hamstrings
	return _part(keys, 14, 16, b)


static func shin() -> Array:
	var keys := [[0.015, 0.049, 0.053, 0.004], [-0.04, 0.05, 0.058, -0.008], [-0.1, 0.049, 0.058, -0.012], [-0.17, 0.044, 0.05, -0.008],
		[-0.25, 0.036, 0.039, -0.002], [-0.33, 0.03, 0.032, 0.0], [-0.39, 0.028, 0.03, 0.0], [-0.425, 0.031, 0.032, 0.0]]
	var b := _mirror([[PI - 0.4, 0.13, 0.45, -0.22, -0.02],  # calves
		[0.0, 0.06, 0.18, -0.35, 0.0],  # shinbone
		[PI / 2, 0.1, 0.25, -0.43, -0.38]])  # ankle bones
	return _part(keys, 14, 16, b)


## foot, lofted heel-to-toe along +Z at ankle height, with toes
static func foot() -> Array:
	var keys := [[-0.055, 0.03, 0.03, 0.0], [-0.02, 0.04, 0.036, 0.0], [0.03, 0.046, 0.03, 0.0], [0.08, 0.05, 0.024, 0.0],
		[0.13, 0.05, 0.017, 0.0], [0.165, 0.042, 0.012, 0.0]]
	var out := _part(keys, 8, 14, [], Transform3D(Basis(Vector3.RIGHT, PI / 2), Vector3(0, -0.405, 0)))
	for i in 5:
		var x := -0.032 + i * 0.016
		var l := 0.03 if i == 2 else 0.024
		var tk := [[0.0, 0.007, 0.006, 0.0], [l * 0.6, 0.006, 0.005, 0.0], [l, 0.003, 0.003, 0.0]]
		out.append_array(_part(tk, 3, 6, [], Transform3D(Basis(Vector3.RIGHT, PI / 2), Vector3(x, -0.425, 0.16))))
	return out


# ------------------------------------------------------------------ costume
static func hakama() -> Array:
	var keys := [[0.04, 0.157, 0.106, 0.0], [-0.06, 0.172, 0.122, 0.0], [-0.18, 0.2, 0.15, 0.0], [-0.32, 0.225, 0.178, 0.0], [-0.47, 0.248, 0.2, 0.0]]
	# pleats: shallow folds all the way round
	var b := []
	for i in 10:
		b.append([TAU * i / 10.0 - PI, 0.035, 0.12, -0.5, 0.05])
	return _part(keys, 9, 24, b)


static func chest_armor() -> Array:
	var keys := [[0.06, 0.158, 0.11, 0.0], [0.16, 0.165, 0.116, 0.004], [0.28, 0.186, 0.124, 0.01], [0.38, 0.205, 0.128, 0.012], [0.45, 0.212, 0.122, 0.0]]
	var b := []
	for i in 5:  # lacquered lames
		var y0 := 0.06 + i * 0.08
		b.append([0.0, 0.03, 3.0, y0, y0 + 0.08])
	return _part(keys, 6, 16, b)

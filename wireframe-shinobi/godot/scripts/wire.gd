@tool
class_name Wire
extends RefCounted
## Helpers for building everything out of line segments.


static func mat(color: Color, alpha: float = 1.0, fog: bool = true, additive: bool = false) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = Color(color, alpha)
	if alpha < 1.0 or additive:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if additive:
		m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
		m.depth_draw_mode = BaseMaterial3D.DEPTH_DRAW_DISABLED
	m.disable_fog = not fog
	return m


static func lines_mesh(pts: PackedVector3Array, m: Material) -> ArrayMesh:
	var am := ArrayMesh.new()
	if pts.size() < 2:
		return am
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = pts
	am.add_surface_from_arrays(Mesh.PRIMITIVE_LINES, arr)
	am.surface_set_material(0, m)
	return am


static func add(parent: Node, pts: PackedVector3Array, m: Material, pos: Vector3 = Vector3.ZERO, ry: float = 0.0) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = lines_mesh(pts, m)
	mi.position = pos
	mi.rotation.y = ry
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(mi)
	return mi


## Box edges plus one diagonal per face, so it reads as triangulated wire.
static func box(w: float, h: float, d: float, c: Vector3 = Vector3.ZERO) -> PackedVector3Array:
	var x := w / 2.0
	var y := h / 2.0
	var z := d / 2.0
	var v := [Vector3(-x, -y, -z), Vector3(x, -y, -z), Vector3(x, y, -z), Vector3(-x, y, -z),
		Vector3(-x, -y, z), Vector3(x, -y, z), Vector3(x, y, z), Vector3(-x, y, z)]
	var e := [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
		0, 2, 4, 6, 0, 7, 1, 6, 0, 5, 3, 6]
	var out := PackedVector3Array()
	for i in e:
		out.append(v[i] + c)
	return out


## Unique triangle edges of any primitive mesh.
static func of_mesh(mesh: Mesh, xf: Transform3D = Transform3D.IDENTITY) -> PackedVector3Array:
	var arrs := mesh.surface_get_arrays(0)
	var verts: PackedVector3Array = arrs[Mesh.ARRAY_VERTEX]
	var idx := PackedInt32Array()
	if arrs[Mesh.ARRAY_INDEX] != null:
		idx = arrs[Mesh.ARRAY_INDEX]
	var n := idx.size() if idx.size() > 0 else verts.size()
	var seen := {}
	var out := PackedVector3Array()
	for t in range(0, n - 2, 3):
		var ids := [t, t + 1, t + 2]
		if idx.size() > 0:
			ids = [idx[t], idx[t + 1], idx[t + 2]]
		for k in 3:
			var a: Vector3 = verts[ids[k]]
			var b: Vector3 = verts[ids[(k + 1) % 3]]
			if a.distance_to(b) < 0.0001:
				continue
			var ka := _key(a)
			var kb := _key(b)
			var key := ka + "|" + kb if ka < kb else kb + "|" + ka
			if seen.has(key):
				continue
			seen[key] = true
			out.append(xf * a)
			out.append(xf * b)
	return out


static func _key(v: Vector3) -> String:
	return "%.3f,%.3f,%.3f" % [v.x, v.y, v.z]


static func cone(r: float, h: float, seg: int, rings: int = 1) -> PackedVector3Array:
	var m := CylinderMesh.new()
	m.top_radius = 0.0
	m.bottom_radius = r
	m.height = h
	m.radial_segments = seg
	m.rings = rings
	m.cap_top = false
	m.cap_bottom = false
	return of_mesh(m)


static func cyl(rt: float, rb: float, h: float, seg: int) -> PackedVector3Array:
	var m := CylinderMesh.new()
	m.top_radius = rt
	m.bottom_radius = rb
	m.height = h
	m.radial_segments = seg
	m.rings = 1
	return of_mesh(m)


static func sphere(r: float, seg: int, rings: int) -> PackedVector3Array:
	var m := SphereMesh.new()
	m.radius = r
	m.height = r * 2.0
	m.radial_segments = seg
	m.rings = rings
	return of_mesh(m)


## Resample profile keys [y, rx, rz, cz] into `n` smooth rings (Catmull-Rom).
static func sample(keys: Array, n: int) -> Array:
	var out := []
	var m := keys.size()
	for i in n:
		var t := float(i) / (n - 1) * (m - 1)
		var k := mini(int(t), m - 2)
		var f := t - k
		var row := []
		for c in 4:
			var p0 := _kv(keys, k - 1, c)
			var p1 := _kv(keys, k, c)
			var p2 := _kv(keys, k + 1, c)
			var p3 := _kv(keys, k + 2, c)
			row.append(0.5 * (2.0 * p1 + (-p0 + p2) * f + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * f * f
				+ (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * f * f * f))
		out.append(row)
	return out


static func _kv(keys: Array, i: int, c: int) -> float:
	var r: Array = keys[clampi(i, 0, keys.size() - 1)]
	return r[c] if c < r.size() else 0.0


## A lofted body part drawn as a quad grid: a ring at each row plus lines running between rows.
## Rows are [y, rx, rz, cz]; angle 0 is the front (+Z). Each bulge [angle, amount, width, y0, y1]
## pushes the surface out around `angle` between heights y0..y1 (muscles, nose, calves).
static func loft(rows: Array, radial: int, bulges: Array = [], xf: Transform3D = Transform3D.IDENTITY) -> PackedVector3Array:
	var rings := loft_rings(rows, radial, bulges, xf)
	var out := PackedVector3Array()
	for ri in rings.size():
		var ring: Array = rings[ri]
		for i in radial:
			out.append(ring[i])
			out.append(ring[(i + 1) % radial])
			if ri + 1 < rings.size():
				out.append(ring[i])
				out.append(rings[ri + 1][i])
	return out


## The same surface as solid triangles, pulled slightly inward. Drawn in the background colour it hides
## the grid lines on the far side of the body, so only the near surface's grid shows.
static func loft_tris(rows: Array, radial: int, bulges: Array = [], xf: Transform3D = Transform3D.IDENTITY, shrink: float = 0.96) -> PackedVector3Array:
	var rings := loft_rings(rows, radial, bulges, xf, shrink)
	var out := PackedVector3Array()
	for ri in rings.size() - 1:
		var a: Array = rings[ri]
		var b: Array = rings[ri + 1]
		for i in radial:
			var i2 := (i + 1) % radial
			out.append_array(PackedVector3Array([a[i], b[i], b[i2], a[i], b[i2], a[i2]]))
	return out


static func loft_rings(rows: Array, radial: int, bulges: Array = [], xf: Transform3D = Transform3D.IDENTITY, shrink: float = 1.0) -> Array:
	var rings := []
	for r in rows:
		var y: float = r[0]
		var rx := maxf(0.0, r[1])
		var rz := maxf(0.0, r[2])
		var cz: float = r[3]
		var ring := []
		for i in radial:
			var th := TAU * i / radial
			var k := 1.0
			for b in bulges:
				if y < b[3] or y > b[4]:
					continue
				var wy := sin(PI * (y - b[3]) / (b[4] - b[3]))
				var d := angle_difference(th, b[0])
				k += b[1] * wy * exp(-(d * d) / (b[2] * b[2]))
			k *= shrink
			ring.append(xf * Vector3(sin(th) * rx * k, y, cz + cos(th) * rz * k))
		rings.append(ring)
	return rings


static func ring(r: float, n: int, y: float = 0.02, c: Vector3 = Vector3.ZERO) -> PackedVector3Array:
	var out := PackedVector3Array()
	for i in n:
		var a0 := float(i) / n * TAU
		var a1 := float(i + 1) / n * TAU
		out.append(c + Vector3(cos(a0) * r, y, sin(a0) * r))
		out.append(c + Vector3(cos(a1) * r, y, sin(a1) * r))
	return out

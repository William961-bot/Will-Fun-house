-- chardecomp port runtime for Minetest/Luanti: executes a character's UCS rules (spec.json), one source tick per
-- step. The same rules and order as the Godot runtime (port/godot_runtime/character.gd); every number comes from
-- the port spec, which comes from verified UCS facts. Rules the UCS does not state are the spec's assumptions.

local R = {}
R.__index = R

local function num(v) return tonumber(v) or 0 end

local function contains(values, v)
	for _, x in ipairs(values) do
		if num(x) == num(v) then return true end
	end
	return false
end

local function copy(t)
	local o = {}
	for k, v in pairs(t) do o[k] = v end
	return o
end

function R.new(spec, initial, projectile)
	local self = setmetatable({spec = spec, by_offset = {}, f = {}, proj = {active = 0, x = 0.0, vx = 0.0}}, R)
	for name, off in pairs(spec.fields) do
		self.by_offset[string.format("0x%x", num(off))] = name
	end
	for i = 1, 2 do
		local c = copy(initial[i])
		c.n = 1
		c.air = num(c.y) > 0 or num(c.vy) > 0
		self.f[i] = c
	end
	if projectile then self.proj = copy(projectile) end
	return self
end

function R:enter(c, state)
	c.state = state
	c.n = 0
end

function R:act(c, a)
	local allowed = contains(a.from, c.state)
	if a.kind == "walk" then
		if allowed then self:enter(c, num(a.to)) end
		if num(c.state) == num(a.to) then c.vx = num(self.spec.physics.walk_speed) end
	elseif a.kind == "jump" then
		if allowed then
			self:enter(c, num(a.to))
			c.vy = num(self.spec.physics.jump_impulse)
			c.air = true
		end
	elseif allowed then
		self:enter(c, num(a.to))
	end
end

function R:ability(c, a)
	if not contains(a.from, c.state) or num(c[a.resource]) < num(a.min) then return end
	c[a.resource] = num(c[a.resource]) - num(a.cost)
	self:enter(c, num(a.to))
end

local function phase(phases, n)
	local k = 0
	for _, ph in ipairs(phases) do
		k = k + num(ph[2])
		if n <= k then return num(ph[1]) end
	end
	return 0
end

function R:advance(c, who)
	local spec = self.spec
	local st = tostring(math.floor(num(c.state)))
	local t = spec.timed[st]
	if t and num(c.n) >= num(t[2]) then
		self:enter(c, num(t[1]))
		st = tostring(math.floor(num(c.state)))
	end
	c.n = num(c.n) + 1
	if spec.fields.hitbox_active then
		c.hitbox_active = spec.moves[st] and phase(spec.moves[st].phases, c.n) or 0
	end
	if who == 1 then
		for _, a in pairs(spec.abilities) do
			local pr = a.projectile
			if pr and num(c.state) == num(a.to) and num(c.n) == num(pr.launch_frame) then
				local dir = num(self.f[2].x) >= num(c.x) and 1.0 or -1.0
				self.proj = {active = 1, x = num(c.x), vx = num(pr.speed) * dir, radius = num(pr.radius),
					on_hit = a.on_hit}
			end
		end
	end
end

function R:move(c)
	local ph = self.spec.physics
	c.x = num(c.x) + num(c.vx)
	c.y = num(c.y) + num(c.vy)
	c.vx = num(c.vx) * num(ph.friction)
	if c.y > 0 or c.vy > 0 then c.vy = c.vy - num(ph.gravity) end
	if c.air and c.y <= 0 then
		c.y = 0.0
		c.vy = 0.0
		c.air = false
	end
end

function R:hit(a, d, effects)
	if not effects then return end
	for _, e in ipairs(effects) do
		local c = e.target == "self" and a or d
		local name = self.by_offset[e.offset]
		if name then
			if e.set ~= nil then
				if name == "state" then
					self:enter(c, num(e.set))
					c.n = 1
				else
					c[name] = e.set
				end
			else
				c[name] = num(c[name]) + num(e.delta)
			end
		end
	end
end

function R:melee(a, d)
	local m = self.spec.moves[tostring(math.floor(num(a.state)))]
	if not m or m.active_from == nil or num(a.n) ~= num(m.active_from) then return end
	if math.abs(num(d.x) - num(a.x)) <= num(m.reach) then self:hit(a, d, m.on_hit) end
end

function R:projectile(d)
	local p = self.proj
	if num(p.active) ~= 1 then return end
	p.x = num(p.x) + num(p.vx)
	if math.abs(num(d.x) - p.x) <= num(p.radius) then
		p.active = 0
		self:hit(self.f[1], d, p.on_hit)
	end
end

function R:step(cmd)
	local key = tostring(cmd)
	local p = self.f[1]
	if self.spec.actions[key] then self:act(p, self.spec.actions[key]) end
	if self.spec.abilities[key] then self:ability(p, self.spec.abilities[key]) end
	for i = 1, 2 do
		self:advance(self.f[i], i)
		self:move(self.f[i])
	end
	self:melee(self.f[1], self.f[2])
	self:projectile(self.f[2])
end

function R:snapshot(tick)
	local out = {tick = tick, fighters = {}, projectile = {active = num(self.proj.active), x = num(self.proj.x)}}
	for i, c in ipairs(self.f) do
		local row = {}
		for name in pairs(self.spec.fields) do
			if c[name] ~= nil then row[name] = c[name] end
		end
		out.fighters[i] = row
	end
	return out
end

return R

# 🎨 HotBando Design Standard - SAHIHI

**Source:** Analytics Page (`/views/admin/analytics.ejs`)
**Style:** White Cards + Colored Icon Badges
**NO GRADIENTS!**

---

## ✅ DESIGN SAHIHI (CORRECT)

### Card Structure

**White Background + Colored Icon Badges**

```html
<div class="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between border border-gray-200">
  <div>
    <p class="text-sm text-gray-500">[LABEL]</p>
    <h2 class="text-3xl font-bold text-gray-800 mt-1" id="[ID]">[VALUE]</h2>
    <p class="text-xs text-[color]-600 mt-1">[TREND/DESCRIPTION]</p>
  </div>
  <div class="p-3 bg-[color]-100 rounded-full">
    <i class="fas fa-[icon] text-[color]-600 text-2xl"></i>
  </div>
</div>
```

### Example: Blue Card

```html
<div class="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between border border-gray-200">
  <div>
    <p class="text-sm text-gray-500">Jumla ya Maonyesho</p>
    <h2 class="text-3xl font-bold text-gray-800 mt-1" id="total-views">1,234</h2>
    <p class="text-xs text-green-600 mt-1">+12% kutoka mwezi uliopita</p>
  </div>
  <div class="p-3 bg-blue-100 rounded-full">
    <i class="fas fa-eye text-blue-600 text-2xl"></i>
  </div>
</div>
```

---

## 🎨 COLOR SYSTEM

### Primary Colors
- **Blue** (`bg-blue-100` + `text-blue-600`)
  - Use for: General stats, totals, main metrics
  - Icon background: `bg-blue-100`
  - Icon color: `text-blue-600`
  - Value color: `text-gray-800` (always dark gray)

- **Green** (`bg-green-100` + `text-green-600`)
  - Use for: Active items, success states, positive metrics
  - Examples: "Active Campaigns", "Online Users"

- **Purple** (`bg-purple-100` + `text-purple-600`)
  - Use for: Users, people-related, groups
  - Examples: "Total Users", "New Users"

- **Orange** (`bg-orange-100` + `text-orange-600`)
  - Use for: Revenue, money, brand-specific
  - Examples: "Revenue", "Sales", "Completion Rate"

### Additional Colors
- **Cyan** (`bg-cyan-100` + `text-cyan-600`)
- **Indigo** (`bg-indigo-100` + `text-indigo-600`)
- **Yellow** (`bg-yellow-100` + `text-yellow-600`)
- **Red** (`bg-red-100` + `text-red-600`)

---

## ❌ DESIGN ISIYO SAHIHI (WRONG)

### NO Gradient Cards!

**DON'T USE:**
```css
/* WRONG - No gradients! */
.stat-card.gradient-blue {
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  color: white;
}
```

**USE THIS INSTEAD:**
```html
<!-- CORRECT - Simple white card -->
<div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
  ...
</div>
```

---

## 📐 CARD DIMENSIONS

### Padding & Spacing
- Card padding: `p-6` (24px)
- Border radius: `rounded-lg` (8px)
- Border: `border border-gray-200` (1px solid #e5e7eb)
- Shadow: `shadow-sm` (subtle shadow)

### Icon Badge
- Padding: `p-3` (12px)
- Shape: `rounded-full` (circle)
- Background: `bg-[color]-100` (light background)
- Icon size: `text-2xl` (24px)
- Icon color: `text-[color]-600` (dark color)

### Text Styles
- Label: `text-sm text-gray-500` (14px, gray)
- Value: `text-3xl font-bold text-gray-800 mt-1` (30px, bold, dark)
- Trend: `text-xs text-[color]-600 mt-1` (12px, colored)

---

## 📊 GRID LAYOUTS

### 4-Column Grid (Desktop)
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
  <!-- 4 cards here -->
</div>
```

### 3-Column Grid
```html
<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <!-- 3 cards here -->
</div>
```

### 2-Column Grid
```html
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  <!-- Cards here -->
</div>
```

---

## 🎯 PAGES TO UPDATE

### ✅ CORRECT Design (Already):
1. **Analytics** (`/admin/analytics`) - ✅ Template reference
2. **Dashboard** (`/admin/dashboard`) - ✅ Fixed today

### ⚠️ NEEDS UPDATE (Remove Gradients):
1. **Vouchers** (`/admin/generate-vouchers`) - ❌ Has gradients
2. **Campaigns** (`/admin/campaigns`) - ❌ Has gradients (if redesigned)
3. **Users** (`/admin/users`) - ⏳ Check if correct

### 🔄 TO BE CREATED:
1. Customer Portal pages
2. Other admin pages

---

## 🔧 CONVERSION GUIDE

### From Gradient Card to White Card

**BEFORE (Wrong):**
```html
<div class="stat-card gradient-orange">
  <div class="flex items-center justify-between">
    <div>
      <p class="stat-label">Mauzo ya Leo</p>
      <p class="stat-value">TZS 50,000</p>
    </div>
    <div class="stat-icon bg-white/20">
      <i class="fas fa-coins text-white"></i>
    </div>
  </div>
</div>

<style>
.stat-card.gradient-orange {
  background: linear-gradient(135deg, #FF7A30 0%, #FF9A5A 100%);
  color: white;
}
</style>
```

**AFTER (Correct):**
```html
<div class="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between border border-gray-200">
  <div>
    <p class="text-sm text-gray-500">Mauzo ya Leo</p>
    <h2 class="text-3xl font-bold text-gray-800 mt-1">TZS 50,000</h2>
    <p class="text-xs text-green-600 mt-1">+15% kutoka jana</p>
  </div>
  <div class="p-3 bg-orange-100 rounded-full">
    <i class="fas fa-coins text-orange-600 text-2xl"></i>
  </div>
</div>
```

---

## 📈 CHARTS

### Chart Container
```html
<div class="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
  <div class="flex justify-between items-center mb-4">
    <h3 class="text-lg font-semibold text-gray-800">[CHART TITLE]</h3>
    <!-- Optional: Period buttons -->
  </div>
  <div style="height: 280px;">
    <canvas id="chart-id"></canvas>
  </div>
</div>
```

### Chart Heights
- Small charts: `200px`
- Medium charts: `280px`
- Large charts: `340px`

---

## 🎨 HOVER EFFECTS

### Card Hover (Optional)
```css
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

Or use Tailwind:
```html
<div class="... transition-all hover:shadow-lg hover:-translate-y-1">
```

---

## 💡 EXAMPLES FROM ANALYTICS PAGE

### Example 1: Total Views
```html
<div class="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between border border-gray-200">
  <div>
    <p class="text-sm text-gray-500">Jumla ya Maonyesho</p>
    <h2 class="text-3xl font-bold text-gray-800 mt-1">12,450</h2>
    <p class="text-xs text-green-600 mt-1">+12% kutoka mwezi uliopita</p>
  </div>
  <div class="p-3 bg-blue-100 rounded-full">
    <i class="fas fa-eye text-blue-600 text-2xl"></i>
  </div>
</div>
```

### Example 2: Revenue
```html
<div class="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between border border-gray-200">
  <div>
    <p class="text-sm text-gray-500">Mapato (Mwezi)</p>
    <h2 class="text-3xl font-bold text-gray-800 mt-1">TZS 2.5M</h2>
    <p class="text-xs text-green-600 mt-1">+15% kutoka mwezi uliopita</p>
  </div>
  <div class="p-3 bg-orange-100 rounded-full">
    <i class="fas fa-money-bill-wave text-orange-600 text-2xl"></i>
  </div>
</div>
```

### Example 3: Active Users
```html
<div class="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between border border-gray-200">
  <div>
    <p class="text-sm text-gray-500">Active Sasa</p>
    <h2 class="text-3xl font-bold text-gray-800 mt-1">89</h2>
    <p class="text-xs text-green-600 mt-1">Watumiaji online</p>
  </div>
  <div class="p-3 bg-green-100 rounded-full">
    <i class="fas fa-signal text-green-600 text-2xl"></i>
  </div>
</div>
```

---

## ✅ CHECKLIST

Before deploying any page, check:

- [ ] Cards use white background (`bg-white`)
- [ ] Cards have border (`border border-gray-200`)
- [ ] Cards have shadow (`shadow-sm`)
- [ ] Icons use colored badges (`bg-[color]-100`)
- [ ] Icon text uses dark color (`text-[color]-600`)
- [ ] Values use dark gray (`text-gray-800`)
- [ ] Labels use light gray (`text-gray-500`)
- [ ] **NO gradient backgrounds!**
- [ ] **NO white text on colored backgrounds!**
- [ ] Responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)

---

## 🚀 NEXT STEPS

1. ✅ Dashboard - Fixed
2. ⏳ Update Vouchers page - Remove gradients
3. ⏳ Update Campaigns page - Remove gradients
4. ⏳ Verify Users page
5. ⏳ Apply to all other pages

---

**KUMBUKA: Analytics page (`/admin/analytics`) ndiyo template SAHIHI!**

Tumia design hiyo kwa pages ZOTE!

---

*Created: 2026-02-08*
*Standard: Analytics Page Design*
*NO GRADIENTS - WHITE CARDS ONLY!*

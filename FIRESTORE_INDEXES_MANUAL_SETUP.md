# 🔥 Manual Firestore Indexes Setup

## ❌ Firebase CLI Authentication Issue

The Firebase CLI cannot be authenticated in this WebContainer environment. You need to manually create the required indexes in your Firebase Console.

## 🎯 Required Indexes for Your Project

### **Project ID:** `app-heitor`

Click on each link below to automatically create the required indexes:

### 1. **Tasks Collection Index**
**Fields:** `active` (Ascending) → `ownerId` (Ascending) → `createdAt` (Descending)

**Direct Link:**
```
https://console.firebase.google.com/v1/r/project/app-heitor/firestore/indexes?create_composite=Ckhwcm9qZWN0cy9hcHAtaGVpdG9yL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy90YXNrcy9pbmRleGVzL18QARoKCgZhY3RpdmUQARoLCgdvd25lcklkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg
```

### 2. **Redemptions Collection Index**
**Fields:** `userId` (Ascending) → `createdAt` (Descending)

**Direct Link:**
```
https://console.firebase.google.com/v1/r/project/app-heitor/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9hcHAtaGVpdG9yL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9yZWRlbXB0aW9ucy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
```

### 3. **Notifications Collection Index**
**Fields:** `toUserId` (Ascending) → `sentAt` (Descending)

**Direct Link:**
```
https://console.firebase.google.com/v1/r/project/app-heitor/firestore/indexes?create_composite=ClBwcm9qZWN0cy9hcHAtaGVpdG9yL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9ub3RpZmljYXRpb25zL2luZGV4ZXMvXxABGgwKCHRvVXNlcklkEAEaCgoGc2VudEF0EAIaDAoIX19uYW1lX18QAg
```

## 📋 Step-by-Step Instructions

### **Step 1: Open Firebase Console**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **`app-heitor`**
3. Navigate to **Firestore Database** → **Indexes**

### **Step 2: Create Each Index**
1. Click on each link above (they will open in new tabs)
2. Click **"Create Index"** button for each one
3. Wait for each index to build (usually 2-5 minutes)

### **Step 3: Verify Creation**
After creating all indexes, you should see them listed in your Firestore Indexes page:

- ✅ **tasks**: `active` ASC, `ownerId` ASC, `createdAt` DESC
- ✅ **redemptions**: `userId` ASC, `createdAt` DESC  
- ✅ **notifications**: `toUserId` ASC, `sentAt` DESC

## 🔄 Alternative: Manual Index Creation

If the direct links don't work, create them manually:

### **Tasks Index:**
1. Go to Firestore → Indexes → **Create Index**
2. Collection ID: `tasks`
3. Add fields in this exact order:
   - `active` → **Ascending**
   - `ownerId` → **Ascending** 
   - `createdAt` → **Descending**
4. Click **Create**

### **Redemptions Index:**
1. Collection ID: `redemptions`
2. Add fields:
   - `userId` → **Ascending**
   - `createdAt` → **Descending**
3. Click **Create**

### **Notifications Index:**
1. Collection ID: `notifications`
2. Add fields:
   - `toUserId` → **Ascending**
   - `sentAt` → **Descending**
3. Click **Create**

## ⏱️ Build Time

Each index typically takes **2-5 minutes** to build. You'll see a status indicator showing:
- 🟡 **Building** (wait for this to complete)
- 🟢 **Enabled** (ready to use)

## ✅ Testing

After all indexes are **Enabled**:
1. Refresh your application at `https://localhost:5173`
2. The Firestore query errors should be resolved
3. Both admin and child panels should work without errors

## 🚨 Important Notes

- **Order matters**: Create fields in the exact order specified
- **Case sensitive**: Field names must match exactly (`userId`, not `userid`)
- **Wait for completion**: Don't test until all indexes show "Enabled"
- **Refresh app**: Clear browser cache if needed

---

**Once you've created these indexes manually, your application will work perfectly!** 🎉
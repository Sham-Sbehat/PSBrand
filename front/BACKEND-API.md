# Backend API Documentation

هذا الملف يوثق الـ API Endpoints المطلوبة للباك اند .NET

## 🔐 Authentication

### تسجيل الدخول
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "role": "admin" | "employee"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt-token",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "admin" | "employee"
    }
  }
}
```

### تسجيل الخروج
```http
POST /api/auth/logout
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح"
}
```

## 📋 Orders (الطلبات)

### جلب جميع الطلبات
```http
GET /api/orders
Authorization: Bearer {token}

Query Parameters:
- status: "pending" | "completed" | "cancelled" (optional)
- employeeId: string (optional)
- page: number (optional)
- limit: number (optional)

Response:
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "string",
        "customerName": "string",
        "customerPhone": "string",
        "customerLocation": "string",
        "customerDetails": "string",
        "size": "string",
        "color": "string",
        "price": number,
        "orderDetails": "string",
        "images": ["url1", "url2"],
        "status": "pending" | "completed" | "cancelled",
        "employeeId": "string",
        "employeeName": "string",
        "createdAt": "ISO8601 datetime",
        "updatedAt": "ISO8601 datetime"
      }
    ],
    "total": number,
    "page": number,
    "limit": number
  }
}
```

### جلب طلب محدد
```http
GET /api/orders/{id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "string",
    "customerName": "string",
    "customerPhone": "string",
    "customerLocation": "string",
    "customerDetails": "string",
    "size": "string",
    "color": "string",
    "price": number,
    "orderDetails": "string",
    "images": ["url1", "url2"],
    "status": "pending" | "completed" | "cancelled",
    "employeeId": "string",
    "employeeName": "string",
    "createdAt": "ISO8601 datetime",
    "updatedAt": "ISO8601 datetime"
  }
}
```

### إنشاء طلب جديد
```http
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "customerName": "string",
  "customerPhone": "string",
  "customerLocation": "string",
  "customerDetails": "string",
  "size": "string",
  "color": "string",
  "price": number,
  "orderDetails": "string"
}

Response:
{
  "success": true,
  "data": {
    "id": "string",
    "message": "تم إنشاء الطلب بنجاح"
  }
}
```

### تحديث حالة الطلب
```http
PATCH /api/orders/{id}/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "pending" | "completed" | "cancelled"
}

Response:
{
  "success": true,
  "message": "تم تحديث حالة الطلب بنجاح"
}
```

### حذف طلب
```http
DELETE /api/orders/{id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "تم حذف الطلب بنجاح"
}
```

### رفع صور التصميم
```http
POST /api/orders/{id}/images
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- images: File[] (multiple files)

Response:
{
  "success": true,
  "data": {
    "imageUrls": ["url1", "url2", "url3"]
  }
}
```

## 👥 Employees (الموظفين)

### جلب جميع الموظفين
```http
GET /api/employees
Authorization: Bearer {token} (Admin only)

Response:
{
  "success": true,
  "data": {
    "employees": [
      {
        "id": "string",
        "name": "string",
        "email": "string",
        "phone": "string",
        "employeeId": "string",
        "createdAt": "ISO8601 datetime"
      }
    ]
  }
}
```

### جلب موظف محدد
```http
GET /api/employees/{id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "employeeId": "string",
    "createdAt": "ISO8601 datetime"
  }
}
```

### إنشاء موظف جديد
```http
POST /api/employees
Authorization: Bearer {token} (Admin only)
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "employeeId": "string",
  "password": "string"
}

Response:
{
  "success": true,
  "data": {
    "id": "string",
    "message": "تم إنشاء حساب الموظف بنجاح"
  }
}
```

### تحديث بيانات موظف
```http
PUT /api/employees/{id}
Authorization: Bearer {token} (Admin only)
Content-Type: application/json

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "employeeId": "string"
}

Response:
{
  "success": true,
  "message": "تم تحديث بيانات الموظف بنجاح"
}
```

### حذف موظف
```http
DELETE /api/employees/{id}
Authorization: Bearer {token} (Admin only)

Response:
{
  "success": true,
  "message": "تم حذف الموظف بنجاح"
}
```

## 📊 Statistics (الإحصائيات)

### إحصائيات الأدمن
```http
GET /api/stats/admin
Authorization: Bearer {token} (Admin only)

Response:
{
  "success": true,
  "data": {
    "totalOrders": number,
    "pendingOrders": number,
    "completedOrders": number,
    "cancelledOrders": number,
    "totalEmployees": number,
    "todayOrders": number,
    "thisWeekOrders": number,
    "thisMonthOrders": number
  }
}
```

### إحصائيات موظف
```http
GET /api/stats/employee/{employeeId}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "totalOrders": number,
    "pendingOrders": number,
    "completedOrders": number,
    "cancelledOrders": number,
    "todayOrders": number,
    "thisWeekOrders": number,
    "thisMonthOrders": number
  }
}
```

## 🔒 Authorization

- جميع الـ endpoints تتطلب `Authorization: Bearer {token}` header
- بعض الـ endpoints مخصصة للأدمن فقط (موضحة بـ "Admin only")
- الموظفون يمكنهم فقط رؤية وإنشاء طلباتهم الخاصة
- الأدمن يمكنه رؤية وإدارة جميع الطلبات والموظفين

## ⚠️ Error Responses

جميع الأخطاء تُرجع بالصيغة التالية:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "رسالة الخطأ بالعربية",
    "details": {} // اختياري
  }
}
```

### أكواد الأخطاء الشائعة:
- `401`: Unauthorized - غير مصرح
- `403`: Forbidden - ممنوع
- `404`: Not Found - غير موجود
- `400`: Bad Request - طلب غير صحيح
- `500`: Internal Server Error - خطأ في السيرفر

## 📝 ملاحظات

1. جميع التواريخ بصيغة ISO8601
2. جميع الأسعار بالشيكل (ILS)
3. رفع الصور يدعم: JPG, PNG, GIF (max 5MB per image)
4. الـ pagination افتراضياً: page=1, limit=20
5. جميع الرسائل والأخطاء بالعربية

## 🚀 مثال على الاستخدام (C# .NET)

```csharp
[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetOrders(
        [FromQuery] string status = null,
        [FromQuery] string employeeId = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        // Implementation
    }

    [HttpPost]
    [Authorize(Roles = "Employee,Admin")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
    {
        // Implementation
    }

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateOrderStatus(
        string id,
        [FromBody] UpdateOrderStatusDto dto)
    {
        // Implementation
    }
}
```



using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PSBrand.API.Data;
using PSBrand.API.Models;

namespace PSBrand.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TestController : ControllerBase
    {
        private readonly PSBrandDbContext _context;

        public TestController(PSBrandDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// اختبار الاتصال بقاعدة البيانات
        /// </summary>
        [HttpGet("database")]
        public async Task<IActionResult> TestDatabaseConnection()
        {
            try
            {
                // اختبار الاتصال بقاعدة البيانات
                var canConnect = await _context.Database.CanConnectAsync();
                
                if (canConnect)
                {
                    // اختبار عدد المستخدمين
                    var userCount = await _context.Users.CountAsync();
                    
                    return Ok(new
                    {
                        message = "تم الاتصال بقاعدة البيانات بنجاح!",
                        database = "PSBrand",
                        userCount = userCount,
                        timestamp = DateTime.Now
                    });
                }
                else
                {
                    return BadRequest(new
                    {
                        message = "فشل في الاتصال بقاعدة البيانات",
                        timestamp = DateTime.Now
                    });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "حدث خطأ في الاتصال بقاعدة البيانات",
                    error = ex.Message,
                    timestamp = DateTime.Now
                });
            }
        }

        /// <summary>
        /// إنشاء بيانات تجريبية
        /// </summary>
        [HttpPost("seed-data")]
        public async Task<IActionResult> SeedTestData()
        {
            try
            {
                // إنشاء مصمم تجريبي
                var designer = new User
                {
                    Name = "أحمد المصمم",
                    Email = "ahmed@designer.com",
                    Phone = "01234567891",
                    Role = UserRole.Designer,
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };

                // إنشاء محضر تجريبي
                var preparer = new User
                {
                    Name = "محمد المحضر",
                    Email = "mohamed@preparer.com",
                    Phone = "01234567892",
                    Role = UserRole.Preparer,
                    IsActive = true,
                    CreatedAt = DateTime.Now
                };

                _context.Users.AddRange(designer, preparer);
                await _context.SaveChangesAsync();

                // إنشاء طلب تجريبي
                var order = new Order
                {
                    OrderNumber = "ORD" + DateTime.Now.ToString("yyyyMMdd") + "0001",
                    CustomerName = "سارة أحمد",
                    CustomerPhone = "01234567893",
                    Country = "مصر",
                    Province = "القاهرة",
                    District = "مدينة نصر",
                    OrderDate = DateTime.Now,
                    TotalAmount = 500.00m,
                    Status = OrderStatus.Pending,
                    DesignerId = designer.Id,
                    CreatedAt = DateTime.Now
                };

                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // إنشاء تصميم تجريبي
                var orderDesign = new OrderDesign
                {
                    OrderId = order.Id,
                    DesignImageUrl = "https://example.com/design1.jpg",
                    FabricType = "قطن",
                    Size = "L",
                    Quantity = 2,
                    UnitPrice = 250.00m,
                    TotalPrice = 500.00m,
                    CreatedAt = DateTime.Now
                };

                _context.OrderDesigns.Add(orderDesign);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "تم إنشاء البيانات التجريبية بنجاح!",
                    designerId = designer.Id,
                    preparerId = preparer.Id,
                    orderId = order.Id,
                    timestamp = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "حدث خطأ في إنشاء البيانات التجريبية",
                    error = ex.Message,
                    timestamp = DateTime.Now
                });
            }
        }

        /// <summary>
        /// الحصول على إحصائيات النظام
        /// </summary>
        [HttpGet("stats")]
        public async Task<IActionResult> GetSystemStats()
        {
            try
            {
                var totalUsers = await _context.Users.CountAsync();
                var totalOrders = await _context.Orders.CountAsync();
                var totalDesigns = await _context.OrderDesigns.CountAsync();
                
                var ordersByStatus = await _context.Orders
                    .GroupBy(o => o.Status)
                    .Select(g => new { Status = g.Key.ToString(), Count = g.Count() })
                    .ToListAsync();

                var usersByRole = await _context.Users
                    .GroupBy(u => u.Role)
                    .Select(g => new { Role = g.Key.ToString(), Count = g.Count() })
                    .ToListAsync();

                return Ok(new
                {
                    totalUsers,
                    totalOrders,
                    totalDesigns,
                    ordersByStatus,
                    usersByRole,
                    timestamp = DateTime.Now
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "حدث خطأ في الحصول على الإحصائيات",
                    error = ex.Message,
                    timestamp = DateTime.Now
                });
            }
        }
    }
}
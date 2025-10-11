using Microsoft.AspNetCore.Mvc;
using PSBrand.API.Models;
using PSBrand.API.Services;

namespace PSBrand.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrdersController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        /// <summary>
        /// الحصول على جميع الطلبات
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrders()
        {
            var orders = await _orderService.GetAllOrdersAsync();
            return Ok(orders);
        }

        /// <summary>
        /// الحصول على طلب محدد
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<Order>> GetOrder(int id)
        {
            var order = await _orderService.GetOrderByIdAsync(id);
            if (order == null)
                return BadRequest("The order Not found");

            return Ok(order);
        }

        /// <summary>
        /// إنشاء طلب جديد
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<Order>> CreateOrder(Order order)
        {
            var createdOrder = await _orderService.CreateOrderAsync(order);
            return CreatedAtAction(nameof(GetOrder), new { id = createdOrder.Id }, createdOrder);
        }

        /// <summary>
        /// تحديث طلب موجود
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateOrder(int id, Order order)
        {
            if (id != order.Id)
                return BadRequest();

            var updatedOrder = await _orderService.UpdateOrderAsync(id, order);
            if (updatedOrder == null)
                return NotFound();

            return NoContent();
        }

        /// <summary>
        /// حذف طلب
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteOrder(int id)
        {
            var result = await _orderService.DeleteOrderAsync(id);
            if (!result)
                return NotFound();

            return NoContent();
        }

        /// <summary>
        /// الحصول على طلبات مصمم محدد
        /// </summary>
        [HttpGet("designer/{designerId}")]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrdersByDesigner(int designerId)
        {
            var orders = await _orderService.GetOrdersByDesignerIdAsync(designerId);
            return Ok(orders);
        }

        /// <summary>
        /// الحصول على الطلبات حسب الحالة
        /// </summary>
        [HttpGet("status/{status}")]
        public async Task<ActionResult<IEnumerable<Order>>> GetOrdersByStatus(OrderStatus status)
        {
            var orders = await _orderService.GetOrdersByStatusAsync(status);
            return Ok(orders);
        }
    }
}
using Microsoft.EntityFrameworkCore;
using PSBrand.API.Data;
using PSBrand.API.Models;

namespace PSBrand.API.Services
{
    public class OrderService : IOrderService
    {
        private readonly PSBrandDbContext _context;

        public OrderService(PSBrandDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<Order>> GetAllOrdersAsync()
        {
            return await _context.Orders
                .Include(o => o.Designer)
                .Include(o => o.Preparer)
                .Include(o => o.OrderDesigns)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<Order?> GetOrderByIdAsync(int id)
        {
            return await _context.Orders
                .Include(o => o.Designer)
                .Include(o => o.Preparer)
                .Include(o => o.OrderDesigns)
                .FirstOrDefaultAsync(o => o.Id == id);
        }

        public async Task<Order> CreateOrderAsync(Order order)
        {
            // Generate Order Number
            order.OrderNumber = GenerateOrderNumber();
            
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();
            return order;
        }

        public async Task<Order?> UpdateOrderAsync(int id, Order order)
        {
            var existingOrder = await _context.Orders.FindAsync(id);
            if (existingOrder == null)
                return null;

            existingOrder.CustomerName = order.CustomerName;
            existingOrder.CustomerPhone = order.CustomerPhone;
            existingOrder.Country = order.Country;
            existingOrder.Province = order.Province;
            existingOrder.District = order.District;
            existingOrder.Status = order.Status;
            existingOrder.TotalAmount = order.TotalAmount;
            existingOrder.PreparerId = order.PreparerId;
            existingOrder.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return existingOrder;
        }

        public async Task<bool> DeleteOrderAsync(int id)
        {
            var order = await _context.Orders.FindAsync(id);
            if (order == null)
                return false;

            _context.Orders.Remove(order);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<Order>> GetOrdersByDesignerIdAsync(int designerId)
        {
            return await _context.Orders
                .Include(o => o.Designer)
                .Include(o => o.Preparer)
                .Include(o => o.OrderDesigns)
                .Where(o => o.DesignerId == designerId)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<Order>> GetOrdersByStatusAsync(OrderStatus status)
        {
            return await _context.Orders
                .Include(o => o.Designer)
                .Include(o => o.Preparer)
                .Include(o => o.OrderDesigns)
                .Where(o => o.Status == status)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        private string GenerateOrderNumber()
        {
            var today = DateTime.Now;
            var prefix = $"ORD{today:yyyyMMdd}";
            var count = _context.Orders.Count(o => o.OrderNumber.StartsWith(prefix)) + 1;
            return $"{prefix}{count:D4}";
        }
    }
}
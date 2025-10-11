using PSBrand.API.Models;

namespace PSBrand.API.Services
{
    public interface IOrderService
    {
        Task<IEnumerable<Order>> GetAllOrdersAsync();
        Task<Order?> GetOrderByIdAsync(int id);
        Task<Order> CreateOrderAsync(Order order);
        Task<Order?> UpdateOrderAsync(int id, Order order);
        Task<bool> DeleteOrderAsync(int id);
        Task<IEnumerable<Order>> GetOrdersByDesignerIdAsync(int designerId);
        Task<IEnumerable<Order>> GetOrdersByStatusAsync(OrderStatus status);
    }
}
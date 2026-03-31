
export const inventoryStore = {
  items: [],
  set(data) {
    this.items = data;
  },
  updateItem(updated) {
    const index = this.items.findIndex(i => i.id === updated.id);
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...updated };
    }
  },
  addItem(item) {
    this.items.push(item);
  },
  removeItem(id) {
    this.items = this.items.filter(i => i.id !== id);
  }
};
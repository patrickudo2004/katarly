import { mutation } from "./_generated/server";

export const clearRotas = mutation({
  handler: async (ctx) => {
    const allRotas = await ctx.db.query("rotas").collect();
    for (const rota of allRotas) {
      await ctx.db.delete(rota._id);
    }
    return `Deleted ${allRotas.length} rota entries`;
  },
});

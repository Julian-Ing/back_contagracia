"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserId = exports.CompanyId = exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
/**
 * Decorator para obtener el usuario actual del request
 * @example
 * async getProfile(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 */
exports.CurrentUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
/**
 * Decorator para obtener el company_id del usuario actual
 * @example
 * async getInvoices(@CompanyId() companyId: string) {
 *   return this.invoicesService.findAll(companyId);
 * }
 */
exports.CompanyId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.company_id;
});
/**
 * Decorator para obtener el user_id del usuario actual
 * @example
 * async getProfile(@UserId() userId: string) {
 *   return this.usersService.findOne(userId);
 * }
 */
exports.UserId = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.sub || request.user?.user_id;
});

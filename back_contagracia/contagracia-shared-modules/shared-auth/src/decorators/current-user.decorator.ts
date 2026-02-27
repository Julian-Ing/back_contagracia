import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator para obtener el usuario actual del request
 * @example
 * async getProfile(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);

/**
 * Decorator para obtener el company_id del usuario actual
 * @example
 * async getInvoices(@CompanyId() companyId: string) {
 *   return this.invoicesService.findAll(companyId);
 * }
 */
export const CompanyId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.company_id;
    },
);

/**
 * Decorator para obtener el user_id del usuario actual
 * @example
 * async getProfile(@UserId() userId: string) {
 *   return this.usersService.findOne(userId);
 * }
 */
export const UserId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user?.sub || request.user?.user_id;
    },
);

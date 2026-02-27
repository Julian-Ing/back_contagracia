/**
 * Decorator para obtener el usuario actual del request
 * @example
 * async getProfile(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 */
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
/**
 * Decorator para obtener el company_id del usuario actual
 * @example
 * async getInvoices(@CompanyId() companyId: string) {
 *   return this.invoicesService.findAll(companyId);
 * }
 */
export declare const CompanyId: (...dataOrPipes: unknown[]) => ParameterDecorator;
/**
 * Decorator para obtener el user_id del usuario actual
 * @example
 * async getProfile(@UserId() userId: string) {
 *   return this.usersService.findOne(userId);
 * }
 */
export declare const UserId: (...dataOrPipes: unknown[]) => ParameterDecorator;

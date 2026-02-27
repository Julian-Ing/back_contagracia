import { ValidationOptions, ValidatorConstraintInterface } from 'class-validator';
export declare class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
    validate(password: string): boolean;
    defaultMessage(): string;
}
/**
 * Validador de fortaleza de contraseña
 * Requiere:
 * - Mínimo 8 caracteres
 * - Al menos 1 mayúscula
 * - Al menos 1 minúscula
 * - Al menos 1 número
 *
 * @example
 * export class CreateUserDto {
 *   @IsStrongPassword()
 *   password: string;
 * }
 */
export declare function IsStrongPassword(validationOptions?: ValidationOptions): (object: any, propertyName: string) => void;

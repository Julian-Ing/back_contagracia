import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string): boolean {
    if (!password) {
      return false;
    }

    // Mínimo 8 caracteres
    if (password.length < 8) {
      return false;
    }

    // Al menos una mayúscula
    if (!/[A-Z]/.test(password)) {
      return false;
    }

    // Al menos una minúscula
    if (!/[a-z]/.test(password)) {
      return false;
    }

    // Al menos un número
    if (!/\d/.test(password)) {
      return false;
    }

    return true;
  }

  defaultMessage(): string {
    return 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número';
  }
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
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

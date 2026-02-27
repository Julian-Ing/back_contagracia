"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsStrongPasswordConstraint = void 0;
exports.IsStrongPassword = IsStrongPassword;
const class_validator_1 = require("class-validator");
let IsStrongPasswordConstraint = class IsStrongPasswordConstraint {
    validate(password) {
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
    defaultMessage() {
        return 'La contraseña debe tener al menos 8 caracteres, incluyendo una mayúscula, una minúscula y un número';
    }
};
exports.IsStrongPasswordConstraint = IsStrongPasswordConstraint;
exports.IsStrongPasswordConstraint = IsStrongPasswordConstraint = __decorate([
    (0, class_validator_1.ValidatorConstraint)({ async: false })
], IsStrongPasswordConstraint);
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
function IsStrongPassword(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: [],
            validator: IsStrongPasswordConstraint,
        });
    };
}

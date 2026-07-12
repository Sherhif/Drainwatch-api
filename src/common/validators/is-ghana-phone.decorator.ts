import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Transform } from 'class-transformer';

const ghanaPhoneRegex = /^\+233\d{9}$/;

export function normalizeGhanaPhoneNumber(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  if (/^233\d{9}$/.test(trimmedValue)) {
    return `+${trimmedValue}`;
  }

  return trimmedValue;
}

export function isGhanaPhoneNumber(value: string) {
  return ghanaPhoneRegex.test(normalizeGhanaPhoneNumber(value) as string);
}

export function NormalizeGhanaPhone() {
  return Transform(({ value }) => normalizeGhanaPhoneNumber(value));
}

export function IsGhanaPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGhanaPhone',
      target: object.constructor,
      propertyName,
      options: {
        message:
          '$property must be a Ghana phone number in +233XXXXXXXXX or 233XXXXXXXXX format',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isGhanaPhoneNumber(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a Ghana phone number in +233XXXXXXXXX or 233XXXXXXXXX format`;
        },
      },
    });
  };
}

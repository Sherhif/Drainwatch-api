import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const ghanaPhoneRegex = /^\+233\d{9}$/;

export function isGhanaPhoneNumber(value: string) {
  return ghanaPhoneRegex.test(value);
}

export function IsGhanaPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isGhanaPhone',
      target: object.constructor,
      propertyName,
      options: {
        message:
          '$property must be a Ghana phone number in +233XXXXXXXXX format',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isGhanaPhoneNumber(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a Ghana phone number in +233XXXXXXXXX format`;
        },
      },
    });
  };
}

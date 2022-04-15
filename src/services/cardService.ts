import faker from "@faker-js/faker";
import dayjs from "dayjs";
import bcrypt from "bcrypt";

import * as cardRepository from "../repositories/cardRepository.js";
import * as companyRepository from "../repositories/companyRepository.js";
import * as employeeRepository from "../repositories/employeeRepository.js";
import {
  cardNumberAlreadyExistsError,
  employeeAlreadyHasCardOfTypeError,
  employeeNotFoundError,
  invalidApiKeyError,
} from "../utils/errorUtils.js";

export interface CardCreationData {
  employeeId: number;
  originalCardId?: number;
  type: cardRepository.TransactionType;
  apiKey: string;
}

export async function create(data: CardCreationData) {
  const company = await getCompanyByApiKey(data.apiKey);

  const employee = await getEmployeeOfCompany(data.employeeId, company.id);
  await checkEmployeeAlreadyHasCardOfType(employee.id, data.type);

  const number = faker.finance.creditCardNumber("mastercard");
  await checkCardNumberAlreadyExists(number);

  const cardholderName = getCardholderName(employee.fullName);

  const expirationDate = dayjs().add(5, "year").format("MM/YY");

  const securityCode = faker.finance.creditCardCVV();
  const encryptedSecurityCode = bcrypt.hashSync(securityCode, 10);

  await cardRepository.insert({
    ...data,
    number,
    cardholderName,
    expirationDate,
    securityCode: encryptedSecurityCode,
    isVirtual: false,
    isBlocked: false,
  });
}

async function getCompanyByApiKey(apiKey: string) {
  const company = await companyRepository.findByApiKey(apiKey);

  if (!company) {
    throw invalidApiKeyError();
  }

  return company;
}

async function getEmployeeOfCompany(employeeId: number, companyId: number) {
  const employee = await employeeRepository.findById(employeeId);

  if (!employee || employee.companyId !== companyId) {
    throw employeeNotFoundError();
  }

  return employee;
}

async function checkEmployeeAlreadyHasCardOfType(
  employeeId: number,
  type: cardRepository.TransactionType
) {
  const existingCardOfEmployee = await cardRepository.findByTypeAndEmployeeId(
    type,
    employeeId
  );

  if (existingCardOfEmployee) {
    throw employeeAlreadyHasCardOfTypeError();
  }
}

async function checkCardNumberAlreadyExists(number: string) {
  const existingCardWithNumber = await cardRepository.findByNumber(number);

  if (existingCardWithNumber) {
    throw cardNumberAlreadyExistsError();
  }
}

function getCardholderName(fullName: string) {
  const names = fullName.split(" ");
  const result = names
    .map((name, index) => {
      const lastIndex = names.length - 1;
      if (index === 0 || index === lastIndex) return name.toUpperCase();
      if (name.length > 2) return name[0].toUpperCase();
    })
    .filter(Boolean)
    .join(" ");

  return result;
}

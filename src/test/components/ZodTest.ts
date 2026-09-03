import { z } from 'zod';

const schema = z.object({
  username: z.string().min(3),
  age: z.number().int().positive(),
});

const testData = [
  {
    username: 'Guus',
    age: 48,
  },
  {
    username: 'Gu',
    age: 48,
  },
  {
    username: 'Guus',
    age: -10,
  },
  {
    username: 'Guus',
    age: '49',
  },
];

testData.forEach((data) => {
  const result = schema.safeParse(data);

  console.log(data, result);
});

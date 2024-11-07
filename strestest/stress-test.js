import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 }, // Tahap pertama, 50 users selama 1 menit
    { duration: '3m', target: 100 }, // Tahap kedua, naik ke 100 users selama 3 menit
    { duration: '2m', target: 0 }, // Tahap ketiga, turun ke 0 users selama 2 menit
  ],
};

export default function () {
  let res = http.get('https://your-api-endpoint.com');
  check(res, {
    'status was 200': (r) => r.status === 200,
    'transaction time OK': (r) => r.timings.duration < 200,
  });
  sleep(1); // Waktu jeda antar permintaan
}

export interface TIFQuestionPreset {
  id: string;
  category: string;
  badge: string;
  title: string;
  description: string;
  questions: {
    text: string;
    codeSnippet?: string;
    codeLanguage?: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
  }[];
}

export const TIF_QUESTION_BANKS: TIFQuestionPreset[] = [
  {
    id: 'algo_cpp',
    category: 'Algoritma & Pemrograman',
    badge: 'C++ / Struktur Data',
    title: 'Dasar Algoritma, Pointer & Struktur Data (C++)',
    description: 'Kumpulan soal analisis logika, output perulangan, pointer, dan kompleksitas algoritma.',
    questions: [
      {
        text: 'Perhatikan potongan kode C++ berikut. Apakah output yang dihasilkan saat program dijalankan?',
        codeLanguage: 'cpp',
        codeSnippet: `#include <iostream>
using namespace std;

int main() {
    int arr[] = {10, 20, 30, 40, 50};
    int *ptr = arr;
    ptr += 2;
    cout << *ptr + *(ptr + 1) << endl;
    return 0;
}`,
        options: ['30', '70', '90', '50'],
        correctOptionIndex: 1,
        explanation: 'ptr awalnya menunjuk ke arr[0] (10). Setelah ptr += 2, ptr menunjuk ke arr[2] (30). Maka *ptr = 30 dan *(ptr + 1) = arr[3] = 40. Hasil 30 + 40 = 70.'
      },
      {
        text: 'Berapakah nilai pengembalian (return value) dari fungsi rekursif berikut jika dipanggil dengan parameter hitung(4)?',
        codeLanguage: 'cpp',
        codeSnippet: `int hitung(int n) {
    if (n <= 1) return 1;
    return n * hitung(n - 1);
}`,
        options: ['10', '16', '24', '120'],
        correctOptionIndex: 2,
        explanation: 'Fungsi ini menghitung faktorial: hitung(4) = 4 * hitung(3) = 4 * 3 * 2 * 1 = 24.'
      },
      {
        text: 'Manakah struktur data yang mengadopsi prinsip LIFO (Last In First Out)?',
        options: ['Queue (Antrean)', 'Stack (Tumpukan)', 'Linked List Berantai', 'Binary Search Tree'],
        correctOptionIndex: 1,
        explanation: 'Stack menggunakan prinsip LIFO di mana elemen yang terakhir dimasukkan akan dikeluarkan pertama kali (operasi push dan pop).'
      },
      {
        text: 'Perhatikan perulangan bersarang berikut. Berapakah kompleksitas waktu (Big-O) dalam kasus terburuk?',
        codeLanguage: 'cpp',
        codeSnippet: `for (int i = 0; i < n; i++) {
    for (int j = 0; j < n; j++) {
        cout << i + j << " ";
    }
}`,
        options: ['O(n)', 'O(log n)', 'O(n²)', 'O(n log n)'],
        correctOptionIndex: 2,
        explanation: 'Dua buah loop berjalan masing-masing sebanyak n kali, sehingga total eksekusi adalah n * n = n², kompleksitasnya O(n²).'
      },
      {
        text: 'Kapan algoritma Binary Search dapat diterapkan secara optimal pada sebuah array?',
        options: [
          'Hanya ketika array sudah terurut (sorted)',
          'Hanya ketika array memiliki jumlah elemen ganjil',
          'Pada array acak tanpa perlu pengurutan',
          'Hanya ketika semua elemen bertipe floating point'
        ],
        correctOptionIndex: 0,
        explanation: 'Binary Search mensyaratkan data dalam keadaan terurut agar dapat membagi interval pencarian menjadi dua bagian setiap iterasinya.'
      }
    ]
  },
  {
    id: 'db_sql',
    category: 'Basis Data',
    badge: 'SQL & RDBMS',
    title: 'Query SQL, Relasi & Integritas Basis Data',
    description: 'Soal pemahaman query DDL, DML, relasi tabel, klausa GROUP BY/HAVING, dan JOIN.',
    questions: [
      {
        text: 'Diberikan query SQL berikut. Klausa manakah yang tepat untuk memfilter grup berdasarkan agregasi?',
        codeLanguage: 'sql',
        codeSnippet: `SELECT jurusan, COUNT(*) AS total_mhs
FROM mahasiswa
GROUP BY jurusan
/* Bagian filter: total_mhs > 50 */`,
        options: [
          'WHERE COUNT(*) > 50',
          'HAVING COUNT(*) > 50',
          'ORDER BY total_mhs > 50',
          'LIMIT COUNT(*) > 50'
        ],
        correctOptionIndex: 1,
        explanation: 'Klausa HAVING digunakan untuk memfilter hasil fungsi agregat setelah proses GROUP BY, sedangkan WHERE hanya memfilter baris individual sebelum pengelompokan.'
      },
      {
        text: 'Jenis JOIN manakah yang menampilkan SEMUA baris dari tabel kiri dan hanya baris yang cocok dari tabel kanan?',
        codeLanguage: 'sql',
        codeSnippet: `SELECT m.nama, n.nilai 
FROM mahasiswa m 
LEFT JOIN nilai n ON m.id = n.mhs_id;`,
        options: ['INNER JOIN', 'LEFT OUTER JOIN', 'RIGHT OUTER JOIN', 'FULL OUTER JOIN'],
        correctOptionIndex: 1,
        explanation: 'LEFT JOIN (atau LEFT OUTER JOIN) mengembalikan seluruh baris dari tabel sisi kiri, dan data yang cocok dari tabel sisi kanan (atau NULL jika tidak ada pasangan).'
      },
      {
        text: 'Karakteristik utama dari tingkat Normalisasi Pertama (1NF) dalam perancangan database relasional adalah...',
        options: [
          'Setiap kolom harus bernilai atomik (tidak boleh ada repeating group atau multi-value)',
          'Menghilangkan semua dependensi transitif antar kolom',
          'Memastikan semua tabel memiliki minimal 5 foreign key',
          'Tabel wajib disimpan dalam format JSON BSON'
        ],
        correctOptionIndex: 0,
        explanation: '1NF mensyaratkan setiap sel atribut hanya berisi nilai atomik (tunggal) dan tidak ada perulangan grup atau array bersarang.'
      },
      {
        text: 'Perhatikan transaksi database berikut. Konsep ACID manakah yang menjamin seluruh langkah transaksi berhasil seluruhnya atau dibatalkan sama sekali (All or Nothing)?',
        codeLanguage: 'sql',
        codeSnippet: `BEGIN TRANSACTION;
UPDATE rekening SET saldo = saldo - 500000 WHERE norek = 'A1';
UPDATE rekening SET saldo = saldo + 500000 WHERE norek = 'B2';
COMMIT;`,
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correctOptionIndex: 0,
        explanation: 'Atomicity (Keatoman) memastikan transaksi dieksekusi sebagai satu kesatuan yang tidak dapat dipecah: berhasil semua atau dibatalkan total jika terjadi kegagalan.'
      }
    ]
  },
  {
    id: 'oop_java_py',
    category: 'Pemrograman Berorientasi Objek',
    badge: 'Java / Python OOP',
    title: 'Object-Oriented Programming (OOP) & Inheritance',
    description: 'Soal prinsip Enkapsulasi, Pewarisan (Inheritance), Polimorfisme, dan Abstraksi.',
    questions: [
      {
        text: 'Perhatikan kode Python berikut. Apakah output saat method bersangkutan dijalankan?',
        codeLanguage: 'python',
        codeSnippet: `class Kendaraan:
    def suara(self):
        return "Brumm"

class Motor(Kendaraan):
    def suara(self):
        return "Ngeeng"

obj = Motor()
print(obj.suara())`,
        options: ['Brumm', 'Ngeeng', 'Brumm Ngeeng', 'AttributeError: suara not found'],
        correctOptionIndex: 1,
        explanation: 'Prinsip method overriding terjadi saat class Motor menimpa implementasi method suara() dari superclass Kendaraan, sehingga menghasilkan "Ngeeng".'
      },
      {
        text: 'Access modifier manakah di Java yang hanya mengizinkan akses dari dalam kelas yang sama dan kelas turunan (subclass) atau package yang sama?',
        options: ['private', 'protected', 'public', 'static'],
        correctOptionIndex: 1,
        explanation: 'Modifier protected memberikan hak akses kepada kelas turunan (subclass) dan kelas lain dalam package yang sama.'
      },
      {
        text: 'Perhatikan potongan kode Java berikut. Apa nama konsep pemanggilan konstruktor kelas induk?',
        codeLanguage: 'java',
        codeSnippet: `public class Dosen extends Pegawai {
    public Dosen(String nama, String nip) {
        super(nama, nip);
    }
}`,
        options: ['Keyword super()', 'Keyword this()', 'Keyword static()', 'Keyword final()'],
        correctOptionIndex: 0,
        explanation: 'super() digunakan untuk memanggil konstruktor milik superclass (induk) dari subclass (anak).'
      }
    ]
  }
];

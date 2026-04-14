/*
 * DISK SCHEDULING SIMULATOR
 */

#include <stdio.h>
#include <stdlib.h>

#define MAX_REQUESTS 100

void fcfs (int requests[], int n, int head);
void sstf (int requests[], int n, int head);
void scan (int requests[], int n, int head, int disk_size);
void look (int requests[], int n, int head);

void print_sequence(int seq[], int len);
void bubble_sort(int arr[], int n);
int find_min_index(int arr[], int visited[], int n, int head);

int main() {
    int requests[MAX_REQUESTS];
    int n, head, disk_size, choice;

    printf("\n=== DISK SCHEDULING SIMULATOR ===\n");

    printf("Enter disk size: ");
    scanf("%d", &disk_size);

    printf("Enter initial head position: ");
    scanf("%d", &head);

    printf("Enter number of requests: ");
    scanf("%d", &n);

    if (n <= 0 || n > MAX_REQUESTS) {
        printf("Invalid number of requests!\n");
        return 0;
    }

    printf("Enter request queue:\n");
    for (int i = 0; i < n; i++) {
        scanf("%d", &requests[i]);
    }

    printf("\n1.FCFS  2.SSTF  3.SCAN  4.LOOK  5.ALL\n");
    printf("Enter choice: ");
    scanf("%d", &choice);

    switch (choice) {
        case 1: fcfs(requests, n, head); break;
        case 2: sstf(requests, n, head); break;
        case 3: scan(requests, n, head, disk_size); break;
        case 4: look(requests, n, head); break;
        case 5:
            fcfs(requests, n, head);
            sstf(requests, n, head);
            scan(requests, n, head, disk_size);
            look(requests, n, head);
            break;
        default:
            printf("Invalid choice!\n");
    }

    return 0;
}

/* ================= FCFS ================= */
void fcfs(int requests[], int n, int head) {
    int total = 0;
    int seq[MAX_REQUESTS + 1];

    seq[0] = head;

    for (int i = 0; i < n; i++) {
        total += abs(requests[i] - head);
        head = requests[i];
        seq[i + 1] = head;
    }

    printf("\n--- FCFS ---\n");
    print_sequence(seq, n + 1);
    printf("Total Seek Time = %d\n", total);
}

/* ================= SSTF ================= */
void sstf(int requests[], int n, int head) {
    int total = 0;
    int seq[MAX_REQUESTS + 1];
    int visited[MAX_REQUESTS] = {0};

    seq[0] = head;

    for (int i = 0; i < n; i++) {
        int idx = find_min_index(requests, visited, n, head);

        total += abs(requests[idx] - head);
        head = requests[idx];
        visited[idx] = 1;
        seq[i + 1] = head;
    }

    printf("\n--- SSTF ---\n");
    print_sequence(seq, n + 1);
    printf("Total Seek Time = %d\n", total);
}

/* ================= SCAN ================= */
void scan(int requests[], int n, int head, int disk_size) {
    int total = 0;
    int seq[MAX_REQUESTS + 2];
    int sorted[MAX_REQUESTS];

    for (int i = 0; i < n; i++) sorted[i] = requests[i];
    bubble_sort(sorted, n);

    int k = 0;
    seq[k++] = head;

    int i;
    for (i = 0; i < n; i++)
        if (sorted[i] >= head) break;

    for (int j = i; j < n; j++) {
        total += abs(sorted[j] - head);
        head = sorted[j];
        seq[k++] = head;
    }

    total += abs((disk_size - 1) - head);
    head = disk_size - 1;
    seq[k++] = head;

    for (int j = i - 1; j >= 0; j--) {
        total += abs(sorted[j] - head);
        head = sorted[j];
        seq[k++] = head;
    }

    printf("\n--- SCAN ---\n");
    print_sequence(seq, k);
    printf("Total Seek Time = %d\n", total);
}

/* ================= LOOK ================= */
void look(int requests[], int n, int head) {
    int total = 0;
    int seq[MAX_REQUESTS + 1];
    int sorted[MAX_REQUESTS];

    for (int i = 0; i < n; i++) sorted[i] = requests[i];
    bubble_sort(sorted, n);

    int k = 0;
    seq[k++] = head;

    int i;
    for (i = 0; i < n; i++)
        if (sorted[i] >= head) break;

    for (int j = i; j < n; j++) {
        total += abs(sorted[j] - head);
        head = sorted[j];
        seq[k++] = head;
    }

    for (int j = i - 1; j >= 0; j--) {
        total += abs(sorted[j] - head);
        head = sorted[j];
        seq[k++] = head;
    }

    printf("\n--- LOOK ---\n");
    print_sequence(seq, k);
    printf("Total Seek Time = %d\n", total);
}

/* ================= HELPERS ================= */
void print_sequence(int seq[], int len) {
    for (int i = 0; i < len; i++) {
        if (i == 0) printf("%d", seq[i]);
        else printf(" -> %d", seq[i]);
    }
    printf("\n");
}

void bubble_sort(int arr[], int n) {
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - i - 1; j++)
            if (arr[j] > arr[j + 1]) {
                int t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
}

int find_min_index(int arr[], int visited[], int n, int head) {
    int min = 99999, idx = -1;

    for (int i = 0; i < n; i++) {
        if (!visited[i] && abs(arr[i] - head) < min) {
            min = abs(arr[i] - head);
            idx = i;
        }
    }
    return idx;
}
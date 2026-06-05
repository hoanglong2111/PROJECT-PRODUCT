import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Drawer,
  FileInput,
  Group,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCheck,
  IconClock,
  IconCoins,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconFileText,
  IconFileUpload,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTruckDelivery,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { useI18n } from '@shared/i18n';
import { mockDtos, type DtoRecord, type DtoQuote, type DtoIssue } from './mockData';

export function Dtos() {
  const { t } = useI18n();
  const [dtos, setDtos] = useState<DtoRecord[]>(mockDtos);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDtoId, setSelectedDtoId] = useState<string | null>(null);
  const [detailOpened, detailHandlers] = useDisclosure(false);
  const [createOpened, createHandlers] = useDisclosure(false);

  // Form states for Create DTO
  const [newDoNumber, setNewDoNumber] = useState('');
  const [newRoute, setNewRoute] = useState('');
  const [newFuelPrice, setNewFuelPrice] = useState('19500');

  const selectedDto = useMemo(
    () => dtos.find((d) => d.id === selectedDtoId) || null,
    [dtos, selectedDtoId]
  );

  const filteredDtos = useMemo(() => {
    const query = search.toLowerCase().trim();
    return dtos.filter((dto) => {
      const matchesSearch =
        dto.dto_number.toLowerCase().includes(query) ||
        dto.do_number.toLowerCase().includes(query) ||
        dto.route_name.toLowerCase().includes(query) ||
        dto.vehicle_plate.toLowerCase().includes(query) ||
        dto.driver_name.toLowerCase().includes(query);

      const matchesStatus = statusFilter === 'all' || dto.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [dtos, search, statusFilter]);

  const handleCreateDto = () => {
    if (!newDoNumber || !newRoute) return;
    const newDto: DtoRecord = {
      id: `dto-${Date.now()}`,
      dto_number: `DTO-2026-${String(dtos.length + 1).padStart(4, '0')}`,
      shipment_id: `shp-${Math.random().toString(36).substr(2, 8)}`,
      do_number: newDoNumber,
      status: 'CREATED',
      route_name: newRoute,
      vehicle_plate: '',
      driver_name: '',
      driver_phone: '',
      fuel_ref_price: Number(newFuelPrice) || 19500,
      actual_delivery_date: null,
      pod_url: null,
      debit_note_number: null,
      issue_level: 'NONE',
      quotes: [],
      issues: [],
    };
    setDtos([newDto, ...dtos]);
    setNewDoNumber('');
    setNewRoute('');
    createHandlers.close();
  };

  const getStatusColor = (status: DtoRecord['status']) => {
    switch (status) {
      case 'CREATED':
        return 'blue';
      case 'ASSIGNED':
        return 'cyan';
      case 'IN_TRANSIT':
        return 'warning';
      case 'DELIVERED':
        return 'teal';
      case 'CLOSED':
        return 'gray';
      default:
        return 'blue';
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Điều phối Vận chuyển Nội địa (DTO)</Title>
          <Text c="dimmed" mt={4}>
            Quản lý tuyến đường, xe tài xế, đối chiếu báo giá Quote 1 / Quote 2 và tải lên chứng từ bàn giao POD.
          </Text>
        </div>
        <Button onClick={createHandlers.open} leftSection={<IconPlus size={16} />}>
          Tạo lệnh điều phối DTO
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 4 }}>
        <MetricCard
          label="Tổng lệnh DTO"
          value={dtos.length}
          color="blue"
          icon={<IconTruckDelivery size={22} />}
        />
        <MetricCard
          label="Đang vận chuyển"
          value={dtos.filter((d) => d.status === 'IN_TRANSIT').length}
          color="orange"
          icon={<IconClock size={22} />}
        />
        <MetricCard
          label="Đã hoàn tất giao hàng"
          value={dtos.filter((d) => d.status === 'DELIVERED' || d.status === 'CLOSED').length}
          color="teal"
          icon={<IconCheck size={22} />}
        />
        <MetricCard
          label="Sự cố vận chuyển"
          value={dtos.filter((d) => d.issue_level !== 'NONE').length}
          color="red"
          icon={<IconAlertTriangle size={22} />}
        />
      </SimpleGrid>

      <Paper withBorder p="md">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          <TextInput
            placeholder="Tìm kiếm mã DTO, DO, Tuyến đường, Biển số..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
          <Select
            placeholder="Lọc theo trạng thái"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val || 'all')}
            data={[
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Mới tạo (CREATED)', value: 'CREATED' },
              { label: 'Đã phân xe (ASSIGNED)', value: 'ASSIGNED' },
              { label: 'Đang giao (IN_TRANSIT)', value: 'IN_TRANSIT' },
              { label: 'Đã giao (DELIVERED)', value: 'DELIVERED' },
              { label: 'Đã đóng (CLOSED)', value: 'CLOSED' },
            ]}
          />
          <Group justify="flex-end">
            <Text size="sm" c="dimmed">
              Hiển thị {filteredDtos.length} dòng
            </Text>
          </Group>
        </SimpleGrid>
      </Paper>

      <Paper withBorder p={0}>
        <ScrollArea>
          <Table miw={900} verticalSpacing="md" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã DTO / Liên kết</Table.Th>
                <Table.Th>Tuyến đường vận chuyển</Table.Th>
                <Table.Th>Xe & Tài xế</Table.Th>
                <Table.Th>Báo giá vận chuyển</Table.Th>
                <Table.Th>Mức độ Sự cố</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredDtos.map((dto) => {
                const approvedQuote = dto.quotes.find((q) => q.status === 'APPROVED');
                return (
                  <Table.Tr key={dto.id}>
                    <Table.Td>
                      <Text fw={700}>{dto.dto_number}</Text>
                      <Text size="xs" c="dimmed">
                        DO: {dto.do_number}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600} size="sm">
                        {dto.route_name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Giá dầu tham chiếu: {dto.fuel_ref_price.toLocaleString()} VND/lít
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {dto.vehicle_plate ? (
                        <>
                          <Text size="sm" fw={600}>
                            {dto.vehicle_plate}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {dto.driver_name} · {dto.driver_phone}
                          </Text>
                        </>
                      ) : (
                        <Text size="xs" c="dimmed" fs="italic">
                          Chưa phân xe
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {approvedQuote ? (
                        <>
                          <Text size="sm" fw={600} c="teal">
                            {approvedQuote.adjusted_price.toLocaleString()} VND
                          </Text>
                          <Text size="xs" c="dimmed">
                            {approvedQuote.carrier_name} (v{approvedQuote.quote_version})
                          </Text>
                        </>
                      ) : dto.quotes.length > 0 ? (
                        <Badge color="orange" variant="light">
                          Chờ duyệt ({dto.quotes.length} bản tin)
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed" fs="italic">
                          Chưa có báo giá
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {dto.issue_level === 'NONE' ? (
                        <Badge color="teal" variant="light">
                          Bình thường
                        </Badge>
                      ) : (
                        <Badge
                          color={
                            dto.issue_level === 'HIGH'
                              ? 'red'
                              : dto.issue_level === 'MEDIUM'
                                ? 'orange'
                                : 'yellow'
                          }
                          variant="filled"
                        >
                          {dto.issue_level}
                        </Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={getStatusColor(dto.status)} variant="light">
                        {dto.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Xem chi tiết & Cập nhật">
                        <ActionIcon
                          variant="subtle"
                          onClick={() => {
                            setSelectedDtoId(dto.id);
                            detailHandlers.open();
                          }}
                        >
                          <IconEye size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* Drawer Detail */}
      <Drawer
        opened={detailOpened}
        onClose={detailHandlers.close}
        title={<Text fw={700} size="lg">Chi tiết Điều phối Vận chuyển DTO</Text>}
        position="right"
        size="xl"
      >
        {selectedDto && (
          <DtoDetailPanel
            dto={selectedDto}
            onUpdate={(updatedDto) => {
              setDtos(dtos.map((d) => (d.id === updatedDto.id ? updatedDto : d)));
            }}
          />
        )}
      </Drawer>

      {/* Modal Create */}
      <Modal opened={createOpened} onClose={createHandlers.close} title="Khởi tạo Lệnh DTO Mới">
        <Stack gap="md">
          <TextInput
            label="Mã DO liên kết"
            placeholder="DO-2026-XXXX"
            value={newDoNumber}
            onChange={(e) => setNewDoNumber(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Tuyến đường vận chuyển"
            placeholder="Ví dụ: Cảng Cát Lái → Kho KBI Bình Dương"
            value={newRoute}
            onChange={(e) => setNewRoute(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Giá dầu tham chiếu định mức (VND/lít)"
            type="number"
            value={newFuelPrice}
            onChange={(e) => setNewFuelPrice(e.currentTarget.value)}
          />
          <Button onClick={handleCreateDto} fullWidth mt="md">
            Lưu lệnh DTO
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

function MetricCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Card withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            {label}
          </Text>
          <Text size="xl" fw={700} mt={4}>
            {value}
          </Text>
        </div>
        <ThemeIcon color={color}>{icon}</ThemeIcon>
      </Group>
    </Card>
  );
}

function ThemeIcon({ children, color }: { children: React.ReactNode; color: string }) {
  const getColors = () => {
    switch (color) {
      case 'blue':
        return { bg: 'var(--mantine-color-blue-light)', c: 'var(--mantine-color-blue-filled)' };
      case 'orange':
        return { bg: 'var(--mantine-color-orange-light)', c: 'var(--mantine-color-orange-filled)' };
      case 'teal':
        return { bg: 'var(--mantine-color-teal-light)', c: 'var(--mantine-color-teal-filled)' };
      case 'red':
        return { bg: 'var(--mantine-color-red-light)', c: 'var(--mantine-color-red-filled)' };
      default:
        return { bg: 'var(--mantine-color-gray-light)', c: 'var(--mantine-color-gray-filled)' };
    }
  };
  const styles = getColors();
  return (
    <div
      style={{
        backgroundColor: styles.bg,
        color: styles.c,
        borderRadius: '8px',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

// Subcomponent: DtoDetailPanel
interface DtoDetailPanelProps {
  dto: DtoRecord;
  onUpdate: (updated: DtoRecord) => void;
}

function DtoDetailPanel({ dto, onUpdate }: DtoDetailPanelProps) {
  // Tabs: quotes, vehicle, delivery, debitnote, issues
  const [activeTab, setActiveTab] = useState<string>('quotes');

  // Form states: Vehicle
  const [vehiclePlate, setVehiclePlate] = useState(dto.vehicle_plate);
  const [driverName, setDriverName] = useState(dto.driver_name);
  const [driverPhone, setDriverPhone] = useState(dto.driver_phone);

  // Form states: Delivery
  const [actualDeliveryDate, setActualDeliveryDate] = useState(dto.actual_delivery_date || '');
  const [podFile, setPodFile] = useState<File | null>(null);

  // Form states: DebitNote
  const [debitNoteNumber, setDebitNoteNumber] = useState(dto.debit_note_number || '');

  // Form states: Issues
  const [newIssueType, setNewIssueType] = useState('');
  const [newIssueDesc, setNewIssueDesc] = useState('');

  // Form states: Quotes
  const [carrierName, setCarrierName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [formula, setFormula] = useState(
    'base_price * (1 + (current_fuel - fuel_ref_price)/fuel_ref_price * 0.2)'
  );

  const saveVehicle = () => {
    onUpdate({
      ...dto,
      vehicle_plate: vehiclePlate,
      driver_name: driverName,
      driver_phone: driverPhone,
      status: dto.status === 'CREATED' ? 'ASSIGNED' : dto.status,
    });
  };

  const saveDelivery = () => {
    onUpdate({
      ...dto,
      actual_delivery_date: actualDeliveryDate,
      pod_url: podFile ? `/uploads/${podFile.name}` : dto.pod_url,
      status: 'DELIVERED',
    });
  };

  const saveDebitNote = () => {
    onUpdate({
      ...dto,
      debit_note_number: debitNoteNumber,
    });
  };

  const addIssue = () => {
    if (!newIssueType || !newIssueDesc) return;
    const newIssue: DtoIssue = {
      id: `issue-${Date.now()}`,
      issue_type: newIssueType,
      description: newIssueDesc,
      reported_at: new Date().toISOString(),
      status: 'OPEN',
    };
    onUpdate({
      ...dto,
      issue_level: 'MEDIUM',
      issues: [...dto.issues, newIssue],
    });
    setNewIssueType('');
    setNewIssueDesc('');
  };

  const addQuote = () => {
    if (!carrierName || !basePrice) return;
    const newQuote: DtoQuote = {
      id: `quote-${Date.now()}`,
      quote_version: dto.quotes.length + 1,
      carrier_name: carrierName,
      base_price: Number(basePrice),
      adjusted_price: Number(basePrice), // Simpler default
      fuel_price_date: new Date().toISOString().split('T')[0],
      fuel_ref_price: dto.fuel_ref_price,
      adjustment_formula: formula,
      status: 'SUBMITTED',
    };
    onUpdate({
      ...dto,
      quotes: [...dto.quotes, newQuote],
    });
    setCarrierName('');
    setBasePrice('');
  };

  const approveQuote = (quoteId: string) => {
    const updatedQuotes = dto.quotes.map((q) => ({
      ...q,
      status: q.id === quoteId ? ('APPROVED' as const) : ('REJECTED' as const),
    }));
    onUpdate({
      ...dto,
      quotes: updatedQuotes,
    });
  };

  return (
    <Stack gap="md" mt="md">
      <Group justify="space-between">
        <div>
          <Title order={3}>{dto.dto_number}</Title>
          <Text size="sm" c="dimmed">
            Liên kết DO: {dto.do_number} · Tuyến: {dto.route_name}
          </Text>
        </div>
        <Badge size="lg" color={dto.status === 'DELIVERED' ? 'teal' : 'blue'}>
          {dto.status}
        </Badge>
      </Group>

      <Tabs value={activeTab} onChange={(val) => setActiveTab(val || 'quotes')}>
        <Tabs.List>
          <Tabs.Tab value="quotes" leftSection={<IconCoins size={14} />}>
            Báo giá & Fuel Adjust
          </Tabs.Tab>
          <Tabs.Tab value="vehicle" leftSection={<IconTruckDelivery size={14} />}>
            Phân xe tài xế
          </Tabs.Tab>
          <Tabs.Tab value="delivery" leftSection={<IconCheck size={14} />}>
            Bàn giao & POD
          </Tabs.Tab>
          <Tabs.Tab value="debitnote" leftSection={<IconFileText size={14} />}>
            Debit Note
          </Tabs.Tab>
          <Tabs.Tab value="issues" leftSection={<IconAlertTriangle size={14} />}>
            Sự cố ({dto.issues.filter((i) => i.status === 'OPEN').length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="quotes" pt="md">
          <Stack gap="md">
            <Text fw={700} size="sm">
              Danh sách Báo giá (Quote 1 & Quote 2)
            </Text>

            <Table verticalSpacing="sm" withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Phiên bản</Table.Th>
                  <Table.Th>Nhà xe</Table.Th>
                  <Table.Th>Giá cơ bản</Table.Th>
                  <Table.Th>Giá điều chỉnh</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {dto.quotes.map((quote) => (
                  <Table.Tr key={quote.id}>
                    <Table.Td>v{quote.quote_version}</Table.Td>
                    <Table.Td>{quote.carrier_name}</Table.Td>
                    <Table.Td>{quote.base_price.toLocaleString()} VND</Table.Td>
                    <Table.Td fw={700} c="blue">
                      {quote.adjusted_price.toLocaleString()} VND
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          quote.status === 'APPROVED'
                            ? 'teal'
                            : quote.status === 'SUBMITTED'
                              ? 'blue'
                              : 'red'
                        }
                        variant="light"
                      >
                        {quote.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {quote.status === 'SUBMITTED' && (
                        <Button size="xs" color="teal" onClick={() => approveQuote(quote.id)}>
                          Duyệt báo giá này
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
                {dto.quotes.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6} align="center">
                      <Text size="sm" c="dimmed">
                        Chưa có bản ghi báo giá nào.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            <Paper withBorder p="md" mt="sm">
              <Text fw={700} size="sm" mb="xs">
                Thêm Báo giá Mới
              </Text>
              <Stack gap="sm">
                <TextInput
                  label="Tên nhà vận chuyển"
                  placeholder="Ví dụ: Logistics Hữu Nghị"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.currentTarget.value)}
                />
                <TextInput
                  label="Giá cước gốc (base_price)"
                  type="number"
                  placeholder="VND"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.currentTarget.value)}
                />
                <TextInput
                  label="Công thức điều chỉnh theo giá dầu (Fuel Adjustment Formula)"
                  value={formula}
                  onChange={(e) => setFormula(e.currentTarget.value)}
                />
                <Button onClick={addQuote} variant="light" color="blue" mt="xs">
                  Gửi báo giá mới (Quotation)
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="vehicle" pt="md">
          <Stack gap="md">
            <TextInput
              label="Biển số xe điều phối"
              placeholder="Ví dụ: 51C-888.88"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.currentTarget.value)}
            />
            <TextInput
              label="Họ tên tài xế"
              placeholder="Ví dụ: Nguyễn Văn A"
              value={driverName}
              onChange={(e) => setDriverName(e.currentTarget.value)}
            />
            <TextInput
              label="Số điện thoại tài xế"
              placeholder="Ví dụ: 0901234567"
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.currentTarget.value)}
            />
            <Button onClick={saveVehicle} color="blue">
              Cập nhật xe & Tài xế
            </Button>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="delivery" pt="md">
          <Stack gap="md">
            <TextInput
              label="Ngày thực tế bàn giao (Actual Delivery Date)"
              type="date"
              value={actualDeliveryDate}
              onChange={(e) => setActualDeliveryDate(e.currentTarget.value)}
            />
            <FileInput
              label="Tải lên biên bản bàn giao POD (PDF/Hình ảnh)"
              placeholder={dto.pod_url ? 'Đã có POD được tải lên' : 'Chọn file...'}
              leftSection={<IconFileUpload size={16} />}
              value={podFile}
              onChange={setPodFile}
            />
            {dto.pod_url && (
              <Group>
                <Badge color="teal">Đã lưu POD</Badge>
                <Button
                  component="a"
                  href={dto.pod_url}
                  target="_blank"
                  variant="subtle"
                  size="xs"
                  leftSection={<IconExternalLink size={12} />}
                >
                  Xem POD cũ
                </Button>
              </Group>
            )}
            <Button onClick={saveDelivery} color="teal">
              Xác nhận hoàn thành giao hàng
            </Button>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="debitnote" pt="md">
          <Stack gap="md">
            <TextInput
              label="Số Debit Note công nợ nhà xe liên kết"
              placeholder="Ví dụ: DN-998822"
              value={debitNoteNumber}
              onChange={(e) => setDebitNoteNumber(e.currentTarget.value)}
            />
            <Button onClick={saveDebitNote} color="blue">
              Lưu liên kết Debit Note
            </Button>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="issues" pt="md">
          <Stack gap="md">
            <Text fw={700} size="sm">
              Lịch sử Sự cố Vận chuyển
            </Text>
            <Table verticalSpacing="sm" withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Loại sự cố</Table.Th>
                  <Table.Th>Mô tả chi tiết</Table.Th>
                  <Table.Th>Thời gian báo</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {dto.issues.map((issue) => (
                  <Table.Tr key={issue.id}>
                    <Table.Td fw={600}>{issue.issue_type}</Table.Td>
                    <Table.Td>{issue.description}</Table.Td>
                    <Table.Td>{new Date(issue.reported_at).toLocaleString()}</Table.Td>
                    <Table.Td>
                      <Badge color={issue.status === 'RESOLVED' ? 'teal' : 'red'}>
                        {issue.status}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {dto.issues.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={4} align="center">
                      <Text size="sm" c="dimmed">
                        Chưa phát sinh sự cố nào trên chuyến đi này.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>

            <Paper withBorder p="md" mt="sm">
              <Text fw={700} size="sm" mb="xs">
                Khai báo Sự cố Mới
              </Text>
              <Stack gap="sm">
                <TextInput
                  label="Loại sự cố"
                  placeholder="Ví dụ: Tai nạn, Hỏng lốp, Trễ giờ cảng..."
                  value={newIssueType}
                  onChange={(e) => setNewIssueType(e.currentTarget.value)}
                />
                <TextInput
                  label="Mô tả sự cố"
                  placeholder="Nhập thông tin chi tiết..."
                  value={newIssueDesc}
                  onChange={(e) => setNewIssueDesc(e.currentTarget.value)}
                />
                <Button onClick={addIssue} color="red">
                  Báo cáo Sự cố
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
